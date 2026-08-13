"""Temporary browser microphone bridge for Deepgram STT/TTS and Groq replies."""

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.operations import _analysis_prompt, _require_call_write_access, ingest_turn
from app.models.operations import Call, CallTurn, Lead
from app.schemas.operations import CallComplete, TurnCreate, VoiceTextTurn
from app.services.voice_adapter import VoiceProviderError, analyze_call, generate_reply, synthesize_audio, transcribe_audio
from app.core.time import utcnow

router = APIRouter(prefix="/voice")


async def _process_customer_turn(call_id: str, campaign_id: str, sequence: int, transcript: str, db: Session, user) -> dict:
    state = ingest_turn(call_id, TurnCreate(campaign_id=campaign_id, sequence=sequence, speaker="customer", transcript=transcript), db, user)
    reply = await generate_reply(state.llm_prompt)
    db.add(CallTurn(id=str(uuid4()), call_id=call_id, sequence=sequence + 1, speaker="ai", transcript=reply, occurred_at=utcnow()))
    db.commit()
    audio_base64 = await synthesize_audio(reply)
    return {
        "transcript": transcript, "reply": reply, "audio_base64": audio_base64,
        "next_customer_sequence": sequence + 2,
        "current_node_id": state.current_node_id, "next_node_id": state.next_node_id,
        "retrieval_context": state.retrieval_context, "escalation": state.escalation,
    }


@router.post("/calls/{call_id}/text-turn")
async def text_turn(call_id: str, payload: VoiceTextTurn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        return await _process_customer_turn(call_id, payload.campaign_id, payload.sequence, payload.transcript, db, user)
    except VoiceProviderError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/calls/{call_id}/audio-turn")
async def audio_turn(
    call_id: str,
    campaign_id: str = Form(...),
    sequence: int = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        transcript = await transcribe_audio(await audio.read(), audio.content_type or "audio/webm")
        if not transcript:
            raise HTTPException(status_code=422, detail="No speech was detected in the uploaded audio")
        return await _process_customer_turn(call_id, campaign_id, sequence, transcript, db, user)
    except VoiceProviderError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/calls/{call_id}/complete-analysis")
async def complete_analysis(call_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_write_access(call, user)
    if call.status != "active":
        raise HTTPException(status_code=409, detail="Only active calls can be analyzed and completed")
    turns = db.query(CallTurn).filter(CallTurn.call_id == call_id).order_by(CallTurn.sequence).all()
    transcript = [{"speaker": turn.speaker, "transcript": turn.transcript} for turn in turns]
    try:
        analysis = await analyze_call(_analysis_prompt(call_id, transcript))
    except VoiceProviderError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    payload = CallComplete(
        outcome=str(analysis.get("outcome", "completed")), summary=str(analysis.get("summary", "")),
        analysis=analysis, follow_up_recommendation=str(analysis.get("follow_up_recommendation", "")),
    )
    call.status = "completed"
    call.completed_at = utcnow()
    call.outcome = payload.outcome
    call.summary = payload.summary
    import json
    call.analysis_json = json.dumps(payload.analysis)
    call.follow_up_recommendation = payload.follow_up_recommendation
    if call.lead_id:
        lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
        if lead:
            lead.summary = payload.summary
            lead.status = "converted" if payload.outcome.lower() in {"converted", "conversion", "won"} else "follow_up"
    db.commit()
    return {"id": call.id, "status": call.status, "analysis": analysis}
