"""Authenticated LiveKit session issuance for the Module 3A voice worker."""

from datetime import timedelta
import logging
import re
from uuid import uuid4

import httpx
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Header
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.operations import _require_call_read_access, _require_call_write_access
from app.core.config import settings
from app.core.time import utcnow
from app.models.operations import Call
from app.models.voice_turn_receipt import VoiceTurnReceipt
from app.services.live_call_flow import call_context, persist_ai_turn, persist_customer_turn
from app.models.campaign import Campaign
from app.models.persona import Persona
from app.models.user import User
from app.models.voice_session import VoiceSession
from app.services.cognitive_intelligence import aggregate_call_experience, as_payload, persist_turn_intelligence
from app.services.sales_intelligence import aggregate_call_sales_intelligence, as_payload as sales_as_payload, persist_turn_sales_intelligence
from app.schemas.voice_session import VoiceSessionCreate, VoiceSessionOut, VoiceSessionStatusOut

router = APIRouter(prefix="/voice/sessions")
logger = logging.getLogger(__name__)


def _opening_instruction_from_frozen_nodes(nodes: list[dict]) -> str | None:
    """Use the frozen opening, but skip markdown headings from plain-text uploads."""
    opening = next((str(node.get("prompt", "")).strip() for node in nodes if isinstance(node, dict) and node.get("type") == "opening"), "")
    # Plain-text section parsing can make a document title the formal opening.
    # Only in that malformed-heading case select the first actual spoken
    # greeting already present in the same immutable snapshot.
    if opening and not opening.lstrip().startswith("#"):
        return opening
    for node in nodes:
        prompt = str(node.get("prompt", "")).strip() if isinstance(node, dict) else ""
        if re.match(r"^(?:hello|hi|good\s+(?:morning|afternoon|evening))\b", prompt, re.I):
            return prompt
    return opening or None


def _mark_worker_failure(call: Call, session: VoiceSession, db: Session) -> None:
    """Release a call only when the worker is confirmed not to have joined."""
    session.status = "worker_failed"
    session.ended_at = utcnow()
    if call.status == "active":
        call.status = "disconnected"
        call.completed_at = session.ended_at
    db.commit()
    aggregate_call_experience(db, call)
    aggregate_call_sales_intelligence(db, call)


def _require_worker_secret(value: str | None) -> None:
    if not settings.voice_worker_secret or value != settings.voice_worker_secret:
        raise HTTPException(status_code=401, detail="Invalid internal voice-service credential")


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
    worker_headers = {"X-EchoAI-Voice-Secret": settings.voice_worker_secret}
    try:
        capability_response = httpx.get(
            f"{settings.voice_worker_url}/api/internal/capabilities",
            headers=worker_headers, timeout=5,
        )
        capability_response.raise_for_status()
        if capability_response.json().get("worker_api_version") != "module-5-sales-context-v1":
            raise ValueError("worker does not support the Module 5 campaign-context contract")
    except (httpx.HTTPError, ValueError, TypeError) as error:
        _mark_worker_failure(call, session, db)
        raise HTTPException(
            status_code=503,
            detail="Voice worker is outdated. Restart the vendored EchoAI/VoicePipeline worker with Module 5 support.",
        ) from error
    campaign = db.query(Campaign).filter(Campaign.id == call.campaign_id).first()
    logger.info("event=voice_worker_start call_id=%s campaign_id=%s agent_id=%s room_name=%s", call.id, call.campaign_id, call.agent_id, session.room_name)
    persona = db.query(Persona).filter(Persona.id == campaign.persona_id).first() if campaign and campaign.persona_id else None
    persona_payload = None
    opening_instruction = None
    if campaign and campaign.call_direction == "outbound":
        try:
            snapshot = json.loads(campaign.script_snapshot_json or "{}")
            nodes = json.loads(snapshot.get("content", "{}"))
            nodes = nodes.get("nodes", []) if isinstance(nodes, dict) else nodes
            opening_instruction = _opening_instruction_from_frozen_nodes(nodes)
        except (TypeError, ValueError, json.JSONDecodeError):
            opening_instruction = None
    # Active campaigns freeze persona behavior at activation.  Older campaigns
    # did not have a snapshot, so retain their current-persona fallback.
    persona_snapshot: dict = {}
    if campaign:
        try:
            parsed_persona = json.loads(campaign.persona_snapshot_json or "{}")
            persona_snapshot = parsed_persona if isinstance(parsed_persona, dict) else {}
        except (TypeError, ValueError, json.JSONDecodeError):
            persona_snapshot = {}
    persona_name = str(persona_snapshot.get("name") or persona_snapshot.get("display_name") or (persona.name if persona else "EchoAI"))
    if persona_snapshot or persona:
        persona_tone = str(persona_snapshot.get("tone") or (persona.tone if persona else "professional"))
        persona_description = str(persona_snapshot.get("description") or (persona.description if persona else ""))
        persona_payload = {
            "id": str(persona_snapshot.get("id") or (persona.id if persona else campaign.persona_id)),
            "display_name": persona_name, "description": persona_description,
            "system_prompt": f"You are EchoAI's {persona_name} persona. Tone: {persona_tone}. {persona_description}",
            "tts": {"provider": "deepgram", "voice": "aura-2-asteria-en", "speech_rate": 1.0},
            "llm": {"temperature": 0.45},
        }
    if opening_instruction:
        # Authoring tools vary in placeholder casing and braces. Resolve every
        # agent/name placeholder before it crosses the worker/TTS boundary.
        opening_instruction = re.sub(r"\[\s*(?:your\s+)?name\s*\]", persona_name, opening_instruction, flags=re.I)
        opening_instruction = re.sub(r"\{\{?\s*(?:agent[_\s-]*)?name\s*\}?\}", persona_name, opening_instruction, flags=re.I)
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
                "opening_delivered": db.query(VoiceTurnReceipt).filter_by(
                    call_id=call.id, speaker="ai", worker_turn_id="0",
                ).first() is not None,
            },
            headers=worker_headers, timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        _mark_worker_failure(call, session, db)
        raise HTTPException(status_code=503, detail="Voice worker could not join the LiveKit room") from error
    session.status = "active"
    db.commit()


def _end_worker(call_id: str) -> None:
    if not settings.voice_worker_url:
        return
    try:
        httpx.post(f"{settings.voice_worker_url}/api/internal/sessions/{call_id}/end", headers={"X-EchoAI-Voice-Secret": settings.voice_worker_secret}, timeout=10)
    except httpx.HTTPError:
        return


@router.post("/internal/{call_id}/customer-turn")
def persist_live_customer_turn(call_id: str, payload: dict, x_echoai_voice_secret: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Persist one finalized STT turn and return compact stage context to worker."""
    _require_worker_secret(x_echoai_voice_secret)
    call = db.query(Call).filter(Call.id == call_id, Call.status == "active").first()
    text = str(payload.get("text", "")).strip()
    worker_turn_id = str(payload.get("turn_id", "")).strip()
    if not call or not text:
        raise HTTPException(status_code=404, detail="Active call or customer text not found")
    if not worker_turn_id:
        raise HTTPException(status_code=422, detail="turn_id is required for idempotent customer-turn persistence")
    requested_next_node_id = payload.get("next_node_id")
    if requested_next_node_id is not None:
        requested_next_node_id = str(requested_next_node_id)
    try:
        turn, transition, duplicate = persist_customer_turn(
            db, call, text=text, worker_turn_id=worker_turn_id,
            requested_next_node_id=requested_next_node_id,
        )
    except ValueError as error:
        logger.warning("event=campaign_context_rejected call_id=%s turn_id=%s reason=%s", call_id, worker_turn_id, str(error))
        raise HTTPException(status_code=409, detail=str(error)) from error
    cognitive = None
    sales = None
    try:
        insight, _cognitive_duplicate = persist_turn_intelligence(db, call, turn, payload.get("acoustic"))
        cognitive = as_payload(insight)
    except Exception:
        logger.warning("event=cognitive_inference_failed call_id=%s worker_turn_id=%s", call.id, worker_turn_id)
    try:
        from app.api.routes.operations import _retrieve_knowledge
        knowledge = _retrieve_knowledge(db, call.campaign_id, text)
        sales_insight, _sales_duplicate = persist_turn_sales_intelligence(db, call, turn, insight if cognitive else None, knowledge)
        sales = sales_as_payload(sales_insight)
    except Exception:
        logger.warning("event=sales_inference_failed call_id=%s worker_turn_id=%s", call.id, worker_turn_id)
    try:
        context = call_context(db, call)
    except ValueError as error:
        logger.error("event=campaign_context_unavailable call_id=%s turn_id=%s reason=%s", call_id, worker_turn_id, str(error))
        raise HTTPException(status_code=409, detail="Frozen campaign context is unavailable for this active call") from error
    logger.info(
        "event=campaign_context_returned call_id=%s turn_id=%s node_id=%s history_count=%s duplicate=%s",
        call_id, worker_turn_id, (context.get("current_node") or {}).get("id"), len(context.get("history") or []), duplicate,
    )
    context["cognitive"] = cognitive
    context["sales"] = sales
    context["stage_transition"] = {
        "advanced": transition.advanced,
        "previous_node_id": transition.previous_node_id,
        "current_node_id": transition.current_node_id,
        "reason": transition.reason,
        "duplicate": duplicate,
    }
    return context

@router.post("/internal/{call_id}/ai-turn")
def persist_live_ai_turn(call_id: str, payload: dict, x_echoai_voice_secret: str | None = Header(default=None), db: Session = Depends(get_db)):
    _require_worker_secret(x_echoai_voice_secret)
    call = db.query(Call).filter(Call.id == call_id, Call.status == "active").first()
    text, worker_turn_id = str(payload.get("text", "")).strip(), str(payload.get("turn_id", ""))
    if not call or not text or not worker_turn_id:
        raise HTTPException(status_code=422, detail="Active call, text, and turn_id are required")
    try:
        turn, duplicate = persist_ai_turn(db, call, text=text, worker_turn_id=worker_turn_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return {"id": turn.id, "duplicate": duplicate}


@router.get("/internal/{call_id}/context")
def get_live_call_context(call_id: str, x_echoai_voice_secret: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Hydrate a restarted worker from the persisted call, never another call."""
    _require_worker_secret(x_echoai_voice_secret)
    call = db.query(Call).filter(Call.id == call_id, Call.status == "active").first()
    if not call:
        raise HTTPException(status_code=404, detail="Active call not found")
    return call_context(db, call)


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
        # A 404 is a confirmed worker-side end, unlike a timeout or 5xx. It is
        # safe to close this database call and release its lead immediately.
        if response.status_code == 404:
            session = db.query(VoiceSession).filter(VoiceSession.call_id == call_id).first()
            if call.status == "active":
                call.status = "disconnected"
                call.completed_at = utcnow()
            if session and session.status != "ended":
                session.status = "ended"
                session.ended_at = call.completed_at or utcnow()
            db.commit()
            aggregate_call_experience(db, call)
            aggregate_call_sales_intelligence(db, call)
            raise HTTPException(status_code=409, detail="The voice worker session ended unexpectedly; the call was closed safely")
        response.raise_for_status()
        return response.json()
    except HTTPException:
        raise
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Live voice events are temporarily unavailable") from error


@router.post("/{call_id}/end", response_model=VoiceSessionStatusOut)
def end_voice_session(call_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_write_access(call, user)
    session = db.query(VoiceSession).filter(VoiceSession.call_id == call_id).first()
    # Disconnect is intentional termination.  It is idempotent so a component
    # unmount/repeated click cannot revive or corrupt a terminal call.
    if call.status == "active":
        call.status = "disconnected"
        call.completed_at = utcnow()
    if session:
        session.status = "ended"
        session.ended_at = utcnow()
    db.commit()
    aggregate_call_experience(db, call)
    aggregate_call_sales_intelligence(db, call)
    _end_worker(call_id)
    if not session:
        return VoiceSessionStatusOut(id="", call_id=call.id, room_name="", status="ended")
    return VoiceSessionStatusOut(id=session.id, call_id=session.call_id, room_name=session.room_name, status=session.status)
