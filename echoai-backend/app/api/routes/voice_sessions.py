"""Authenticated LiveKit session issuance for the Module 3A voice worker."""

from datetime import timedelta
from uuid import uuid4

import httpx
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.operations import _require_call_read_access, _require_call_write_access
from app.core.config import settings
from app.core.time import utcnow
from app.models.operations import Call
from app.models.campaign import Campaign
from app.models.persona import Persona
from app.models.user import User
from app.models.voice_session import VoiceSession
from app.schemas.voice_session import VoiceSessionCreate, VoiceSessionOut, VoiceSessionStatusOut

router = APIRouter(prefix="/voice/sessions")


def _require_livekit_configuration() -> None:
    if not all((settings.livekit_url, settings.livekit_api_key, settings.livekit_api_secret)):
        raise HTTPException(status_code=503, detail="LiveKit is not configured for this environment")


def _issue_token(room_name: str, identity: str) -> str:
    try:
        from livekit import api
    except ModuleNotFoundError as error:
        raise HTTPException(status_code=503, detail="LiveKit API package is not installed") from error

    return (
        api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(identity)
        .with_name("EchoAI Agent")
        .with_grants(api.VideoGrants(room_join=True, room=room_name, can_publish=True, can_subscribe=True))
        .with_ttl(timedelta(minutes=15))
        .to_jwt()
    )


def _start_worker(call: Call, session: VoiceSession, db: Session) -> None:
    """Ask the separately deployed Module 3A process to join this exact room."""
    if not settings.voice_worker_url:
        return
    campaign = db.query(Campaign).filter(Campaign.id == call.campaign_id).first()
    persona = db.query(Persona).filter(Persona.id == campaign.persona_id).first() if campaign and campaign.persona_id else None
    persona_payload = None
    opening_instruction = None
    if campaign and campaign.call_direction == "outbound":
        try:
            snapshot = json.loads(campaign.script_snapshot_json or "{}")
            nodes = json.loads(snapshot.get("content", "{}"))
            nodes = nodes.get("nodes", []) if isinstance(nodes, dict) else nodes
            opening_instruction = next((node.get("prompt") for node in nodes if isinstance(node, dict) and node.get("type") == "opening"), None)
        except (TypeError, ValueError, json.JSONDecodeError):
            opening_instruction = None
    if persona:
        persona_payload = {
            "id": persona.id, "display_name": persona.name, "description": persona.description,
            "system_prompt": f"You are EchoAI's {persona.name} persona. Tone: {persona.tone}. {persona.description}",
            "tts": {"provider": "deepgram", "voice": "aura-2-asteria-en", "speech_rate": 1.0},
            "llm": {"temperature": 0.45},
        }
    try:
        response = httpx.post(
            f"{settings.voice_worker_url}/api/internal/sessions/start",
            json={
                "call_id": call.id,
                "room_name": session.room_name,
                "participant_identity": session.participant_identity,
                "persona_id": campaign.persona_id if campaign else None,
                "persona": persona_payload,
                "opening_instruction": opening_instruction,
            },
            headers={"X-EchoAI-Voice-Secret": settings.voice_worker_secret}, timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        session.status = "worker_failed"
        db.commit()
        raise HTTPException(status_code=503, detail="Voice worker could not join the LiveKit room") from error
    session.status = "active"
    db.commit()


def _end_worker(call_id: str) -> None:
    if not settings.voice_worker_url:
        return
    try:
        httpx.post(
            f"{settings.voice_worker_url}/api/internal/sessions/{call_id}/end",
            headers={"X-EchoAI-Voice-Secret": settings.voice_worker_secret}, timeout=10,
        )
    except httpx.HTTPError:
        # The call lifecycle remains authoritative even if the worker is already gone.
        return


@router.post("", response_model=VoiceSessionOut, status_code=status.HTTP_201_CREATED)
def create_voice_session(payload: VoiceSessionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_livekit_configuration()
    call = db.query(Call).filter(Call.id == payload.call_id).first()
    if not call or call.status != "active":
        raise HTTPException(status_code=404, detail="Active call not found")
    _require_call_write_access(call, user)

    session = db.query(VoiceSession).filter(VoiceSession.call_id == call.id).first()
    if not session:
        session = VoiceSession(
            id=str(uuid4()), call_id=call.id, room_name=f"echoai-call-{call.id}",
            participant_identity=f"echoai-agent-{user.id}-{uuid4().hex[:8]}",
        )
        db.add(session)
    else:
        session.status = "ready"
        session.ended_at = None
        session.participant_identity = f"echoai-agent-{user.id}-{uuid4().hex[:8]}"
    db.commit()
    db.refresh(session)
    _start_worker(call, session, db)
    db.refresh(session)
    return VoiceSessionOut(
        id=session.id, call_id=session.call_id, room_name=session.room_name,
        participant_identity=session.participant_identity, status=session.status,
        livekit_url=settings.livekit_url, participant_token=_issue_token(session.room_name, session.participant_identity),
    )


@router.get("/{call_id}", response_model=VoiceSessionStatusOut)
def get_voice_session(call_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_read_access(call, user)
    session = db.query(VoiceSession).filter(VoiceSession.call_id == call_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Voice session not found")
    return VoiceSessionStatusOut(id=session.id, call_id=session.call_id, room_name=session.room_name, status=session.status)


@router.get("/{call_id}/live")
def get_live_voice_session(call_id: str, after: int = 0, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_read_access(call, user)
    if not settings.voice_worker_url:
        raise HTTPException(status_code=503, detail="Voice worker is not configured")
    try:
        response = httpx.get(f"{settings.voice_worker_url}/api/internal/sessions/{call_id}/live", params={"after": after}, headers={"X-EchoAI-Voice-Secret": settings.voice_worker_secret}, timeout=4)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Live voice events are temporarily unavailable") from error


@router.post("/{call_id}/end", response_model=VoiceSessionStatusOut)
def end_voice_session(call_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_write_access(call, user)
    session = db.query(VoiceSession).filter(VoiceSession.call_id == call_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Voice session not found")
    session.status = "ended"
    session.ended_at = utcnow()
    db.commit()
    _end_worker(call_id)
    return VoiceSessionStatusOut(id=session.id, call_id=session.call_id, room_name=session.room_name, status=session.status)
