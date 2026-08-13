"""Low-latency operational APIs shared by the 3A voice pipeline and Track B."""

import csv
import json
from datetime import datetime
from io import StringIO
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.models.campaign import Campaign
from app.models.operations import Call, CallState, CallTurn, EscalationAlert, EscalationEvent, KnowledgeEntry, Lead, ObjectionEntry, SupervisorMessage
from app.models.script import Script
from app.models.user import User
from app.models.system_setting import SystemSetting
from app.api.routes.system_settings import SETTING_ID
from app.core.time import utcnow
from app.schemas.operations import (
    CallAnalysisPrompt,
    CallComplete,
    CallCreate,
    CallControl,
    EscalationAction,
    KnowledgeCreate,
    KnowledgeUpdate,
    LeadCreate,
    LeadUpdate,
    ObjectionCreate,
    ObjectionUpdate,
    SupervisorWhisperCreate,
    TurnCreate,
    TurnResponse,
)

router = APIRouter()
admin_router = APIRouter(prefix="/scripts/{script_id}/objections")

HUMAN_REQUEST_TERMS = ("human", "supervisor", "real person", "agent please")
CRITICAL_TERMS = ("cancel", "complaint", "legal action", "fraud")


def _require_call_read_access(call: Call, user: User) -> None:
    """Agents only see their assigned calls; supervisors retain monitoring access."""
    if user.role in {"admin", "supervisor"}:
        return
    if user.role != "agent" or call.agent_id != user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this call")


def _require_call_write_access(call: Call, user: User) -> None:
    """Only the assigned agent or an administrator may progress a call."""
    if user.role == "admin" or (user.role == "agent" and call.agent_id == user.id):
        return
    raise HTTPException(status_code=403, detail="You cannot update this call")


def _script_nodes(script: Script | None = None, content: str | None = None) -> list[dict]:
    """Accept legacy text scripts and canonical JSON-node scripts during migration."""
    source = content if content is not None else (script.content if script else None)
    if not source:
        return []
    try:
        parsed = json.loads(source)
        nodes = parsed.get("nodes", []) if isinstance(parsed, dict) else parsed
        return nodes if isinstance(nodes, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def _campaign_script_nodes(db: Session, campaign: Campaign) -> list[dict]:
    """Use the activation snapshot so historical calls never drift with later edits."""
    try:
        snapshot = json.loads(campaign.script_snapshot_json or "{}")
        if snapshot.get("content"):
            return _script_nodes(content=snapshot["content"])
    except (TypeError, json.JSONDecodeError):
        pass
    script = db.query(Script).filter(Script.id == campaign.script_id).first() if campaign.script_id else None
    return _script_nodes(script)


def _match_objection(db: Session, script_id: str | None, node_id: str | None, text: str) -> ObjectionEntry | None:
    if not script_id:
        return None
    lowered = text.lower()
    entries = db.query(ObjectionEntry).filter(ObjectionEntry.script_id == script_id).all()
    scored: list[tuple[int, ObjectionEntry]] = []
    for entry in entries:
        terms = json.loads(entry.trigger_terms_json or "[]")
        score = sum(1 for term in terms if term.lower() in lowered)
        if entry.node_id == node_id:
            score += 1
        if score:
            scored.append((score, entry))
    return max(scored, key=lambda item: item[0])[1] if scored else None


def _retrieve_knowledge(db: Session, campaign_id: str, query: str, limit: int = 4) -> list[dict]:
    """Return published campaign material before global material for prompt grounding."""
    terms = {term for term in query.lower().split() if len(term) > 2}
    entries = (
        db.query(KnowledgeEntry)
        .filter(KnowledgeEntry.status == "published")
        .filter((KnowledgeEntry.campaign_id == campaign_id) | (KnowledgeEntry.campaign_id.is_(None)))
        .all()
    )
    scored: list[tuple[int, int, KnowledgeEntry]] = []
    for entry in entries:
        haystack = f"{entry.title} {entry.category} {entry.content}".lower()
        score = sum(1 for term in terms if term in haystack)
        # Campaign-scoped content wins ties over global content.
        scope_rank = 1 if entry.campaign_id == campaign_id else 0
        if score or not terms:
            scored.append((score, scope_rank, entry))
    scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [
        {"id": entry.id, "title": entry.title, "category": entry.category, "content": entry.content,
         "scope": "campaign" if entry.campaign_id else "global", "relevance": score,
         "source_label": f"{('campaign' if entry.campaign_id else 'global')}:{entry.title}"}
        for score, _, entry in scored[:limit]
    ]


def _ensure_knowledge_campaign_editable(db: Session, campaign_id: str | None) -> None:
    """Keep campaign-scoped source material immutable once its history is closed."""
    if not campaign_id:
        return
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status in {"completed", "archived"}:
        raise HTTPException(status_code=409, detail="Knowledge for a completed or archived campaign is read-only")


def _turn_prompt(campaign: Campaign, current_node: dict | None, memory: list[dict], knowledge: list[dict], objection: ObjectionEntry | None) -> str:
    node = current_node or {}
    transcript = "\n".join(f"{item['speaker']}: {item['text']}" for item in memory[-8:])
    sources = "\n".join(f"[{item['source_label']}] {item['content']}" for item in knowledge)
    objection_rule = objection.approved_response if objection else "No approved objection response matched."
    return f"""You are EchoAI on a live sales call. Produce one concise, natural next reply only.
Campaign: {campaign.name}. Product: {campaign.product}. Audience: {campaign.audience}. Goal: {campaign.goal}.
Current script node: {node.get('id', 'none')} ({node.get('type', 'none')}). Node goal: {node.get('goal', '')}. Node instruction: {node.get('prompt', '')}.
Recent transcript:
{transcript or 'No prior turns.'}
Retrieved approved knowledge (campaign sources have priority):
{sources or 'No knowledge retrieved.'}
Approved objection guidance: {objection_rule}
Rules: stay truthful; do not invent pricing, policy, or product facts; use retrieved knowledge when relevant; if a human is requested, acknowledge the request and do not resist escalation; never use toxic or insulting language."""


def _analysis_prompt(call_id: str, transcript: list[dict]) -> str:
    conversation = "\n".join(f"{item['speaker']}: {item['transcript']}" for item in transcript)
    return f"""Analyze this completed EchoAI sales call. Return valid JSON only with these keys:
summary (string), start_sentiment (positive|neutral|negative), end_sentiment (positive|neutral|negative), overall_sentiment (positive|neutral|negative), intent (string), outcome (string), toxic_language (array of objects with phrase and speaker), objections (array of strings), extracted_lead_details (object with contact_details array, stated_needs array, timeline string, budget_context string, decision_maker_context string), follow_up_recommendation (string).
Do not infer sensitive traits or unstated information. For unknown lead details use empty arrays or empty strings. Only flag toxic language that is explicitly present. Keep the summary factual and concise.
Call ID: {call_id}
Transcript:
{conversation}"""


def _escalation_reason(text: str, unresolved_objections: int) -> str | None:
    lowered = text.lower()
    if any(term in lowered for term in HUMAN_REQUEST_TERMS):
        return "Customer requested human supervisor assistance"
    if any(term in lowered for term in CRITICAL_TERMS):
        return "Configured critical phrase detected"
    if unresolved_objections >= 2:
        return "Repeated unresolved objection"
    return None


@admin_router.post("", status_code=status.HTTP_201_CREATED)
def create_objection(script_id: str, payload: ObjectionCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    linked_campaign = db.query(Campaign).filter(
        Campaign.script_id == script_id,
        Campaign.status.in_(("active", "completed", "archived")),
    ).first()
    if linked_campaign:
        if linked_campaign.status == "active":
            raise HTTPException(status_code=409, detail="Pause or complete the active campaign before changing its objection guidance")
        raise HTTPException(status_code=409, detail="Objection guidance for a completed or archived campaign is read-only")
    node_ids = {node.get("id") for node in _script_nodes(script) if isinstance(node, dict)}
    if payload.node_id and payload.node_id not in node_ids:
        raise HTTPException(status_code=422, detail="Objection guidance must reference a node in this script")
    entry = ObjectionEntry(
        id=str(uuid4()), script_id=script_id, node_id=payload.node_id, category=payload.category,
        trigger_terms_json=json.dumps(payload.trigger_terms), approved_response=payload.approved_response,
    )
    db.add(entry)
    db.commit()
    return {"id": entry.id, "script_id": entry.script_id, **payload.model_dump()}


@admin_router.get("")
def list_objections(script_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    entries = db.query(ObjectionEntry).filter(ObjectionEntry.script_id == script_id).all()
    return [{"id": item.id, "script_id": item.script_id, "node_id": item.node_id, "category": item.category,
             "trigger_terms": json.loads(item.trigger_terms_json or "[]"), "approved_response": item.approved_response} for item in entries]


def _require_objection_editable(db: Session, script_id: str) -> Script:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    campaign = db.query(Campaign).filter(
        Campaign.script_id == script_id,
        Campaign.status.in_(("active", "completed", "archived")),
    ).first()
    if campaign:
        message = "Pause or complete the active campaign before changing its objection guidance" if campaign.status == "active" else "Objection guidance for completed or archived campaigns is read-only"
        raise HTTPException(status_code=409, detail=message)
    return script


@admin_router.put("/{entry_id}")
def update_objection(script_id: str, entry_id: str, payload: ObjectionUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    script = _require_objection_editable(db, script_id)
    entry = db.query(ObjectionEntry).filter(ObjectionEntry.id == entry_id, ObjectionEntry.script_id == script_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Objection guidance not found")
    if payload.node_id:
        node_ids = {node.get("id") for node in _script_nodes(script) if isinstance(node, dict)}
        if payload.node_id not in node_ids:
            raise HTTPException(status_code=422, detail="Objection guidance must reference a node in this script")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, "trigger_terms_json" if field == "trigger_terms" else field, json.dumps(value) if field == "trigger_terms" else value)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "script_id": entry.script_id, "node_id": entry.node_id, "category": entry.category,
            "trigger_terms": json.loads(entry.trigger_terms_json or "[]"), "approved_response": entry.approved_response}


@admin_router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_objection(script_id: str, entry_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    _require_objection_editable(db, script_id)
    entry = db.query(ObjectionEntry).filter(ObjectionEntry.id == entry_id, ObjectionEntry.script_id == script_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Objection guidance not found")
    db.delete(entry)
    db.commit()
    return None


@router.post("/calls", status_code=status.HTTP_201_CREATED)
def create_call(payload: CallCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in {"admin", "agent"}:
        raise HTTPException(status_code=403, detail="Only agents can start calls")
    campaign = db.query(Campaign).filter(Campaign.id == payload.campaign_id).first()
    if not campaign or campaign.status != "active":
        raise HTTPException(status_code=409, detail="An active campaign is required to start a call")
    setting = db.query(SystemSetting).filter(SystemSetting.id == SETTING_ID).first()
    max_concurrent_calls = setting.max_concurrent_calls if setting else 100
    active_call_count = db.query(Call).filter(Call.status == "active").count()
    if active_call_count >= max_concurrent_calls:
        raise HTTPException(status_code=409, detail="The configured concurrent call limit has been reached")
    if user.role == "agent" and not payload.lead_id:
        raise HTTPException(status_code=422, detail="Agents must select an assigned lead before starting a call")
    lead = None
    if payload.lead_id:
        lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
        if not lead or lead.campaign_id != campaign.id:
            raise HTTPException(status_code=404, detail="Lead not found for this campaign")
        if user.role == "agent" and lead.assigned_agent_id != user.id:
            raise HTTPException(status_code=403, detail="You can only call leads assigned to you")
        if db.query(Call).filter(Call.lead_id == lead.id, Call.status == "active").first():
            raise HTTPException(status_code=409, detail="This lead already has an active call")
    nodes = _campaign_script_nodes(db, campaign)
    call = Call(
        id=str(uuid4()), campaign_id=campaign.id, lead_id=payload.lead_id,
        agent_id=user.id if user.role == "agent" else (lead.assigned_agent_id if lead else None),
    )
    state = CallState(call_id=call.id, current_node_id=nodes[0].get("id") if nodes else None)
    db.add_all([call, state])
    db.commit()
    return {"id": call.id, "campaign_id": call.campaign_id, "current_node_id": state.current_node_id, "status": call.status}


@router.post("/calls/{call_id}/turns", response_model=TurnResponse)
def ingest_turn(call_id: str, payload: TurnCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call or call.status != "active" or call.campaign_id != payload.campaign_id:
        raise HTTPException(status_code=404, detail="Active call not found")
    _require_call_write_access(call, user)
    state = db.query(CallState).filter(CallState.call_id == call_id).first()
    if state and state.is_held:
        raise HTTPException(status_code=409, detail="Call is on hold and cannot accept conversation turns")
    campaign = db.query(Campaign).filter(Campaign.id == call.campaign_id).first()
    if not campaign or campaign.status not in {"active", "paused"}:
        raise HTTPException(status_code=409, detail="This campaign no longer accepts call turns")
    if db.query(CallTurn).filter(CallTurn.call_id == call_id, CallTurn.sequence == payload.sequence).first():
        raise HTTPException(status_code=409, detail="A turn with this sequence has already been recorded")
    previous_turn = db.query(CallTurn).filter(CallTurn.call_id == call_id).order_by(CallTurn.sequence.desc()).first()
    if previous_turn and payload.sequence != previous_turn.sequence + 1:
        raise HTTPException(status_code=409, detail="Turn sequence must continue from the latest recorded turn")
    if not previous_turn and payload.sequence not in {0, 1}:
        raise HTTPException(status_code=422, detail="The first turn sequence must be 0 or 1")
    nodes = _campaign_script_nodes(db, campaign) if campaign else []
    db.add(CallTurn(id=str(uuid4()), call_id=call_id, sequence=payload.sequence, speaker=payload.speaker,
                    transcript=payload.transcript, occurred_at=payload.occurred_at or utcnow()))
    memory = json.loads(state.recent_memory_json or "[]")
    memory.append({"speaker": payload.speaker, "text": payload.transcript})
    state.recent_memory_json = json.dumps(memory[-8:])
    current_index = next((index for index, node in enumerate(nodes) if node.get("id") == state.current_node_id), 0)
    if payload.speaker == "customer" and nodes and current_index < len(nodes) - 1:
        completed = json.loads(state.completed_node_ids_json or "[]")
        if state.current_node_id and state.current_node_id not in completed:
            completed.append(state.current_node_id)
        state.completed_node_ids_json = json.dumps(completed)
        state.current_node_id = nodes[current_index + 1].get("id")
    objection = _match_objection(db, campaign.script_id if campaign else None, state.current_node_id, payload.transcript)
    if objection and payload.speaker == "customer":
        state.unresolved_objections += 1
    reason = _escalation_reason(payload.transcript, state.unresolved_objections)
    alert = None
    if reason:
        alert = (
            db.query(EscalationAlert)
            .filter(EscalationAlert.call_id == call_id, EscalationAlert.reason == reason, EscalationAlert.status != "resolved")
            .first()
        )
        if not alert:
            alert = EscalationAlert(id=str(uuid4()), call_id=call_id, campaign_id=call.campaign_id, reason=reason)
            db.add(alert)
            db.add(EscalationEvent(
                id=str(uuid4()), alert_id=alert.id, actor_id=user.id,
                action="auto_triggered", note=reason,
            ))
    db.commit()
    current_node = next((node for node in nodes if node.get("id") == state.current_node_id), None)
    next_node_ids = current_node.get("next_node_ids") if current_node else None
    next_id = (next_node_ids or [None])[0]
    fallback_reply = objection.approved_response if objection else (current_node.get("prompt") if current_node else None)
    knowledge = _retrieve_knowledge(db, call.campaign_id, payload.transcript)
    return TurnResponse(call_id=call_id, next_sequence=payload.sequence + 1, current_node_id=state.current_node_id, next_node_id=next_id,
                        approved_objection_response=objection.approved_response if objection else None,
                        suggested_reply=fallback_reply,
                        escalation={"id": alert.id, "reason": alert.reason, "severity": alert.severity} if alert else None,
                        retrieval_context=knowledge,
                        llm_prompt=_turn_prompt(campaign, current_node, memory, knowledge, objection))


@router.post("/calls/{call_id}/controls")
def update_call_control(call_id: str, payload: CallControl, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Persist call-control state for the browser bridge and future 3A stream."""
    call = db.query(Call).filter(Call.id == call_id, Call.status == "active").first()
    if not call:
        raise HTTPException(status_code=404, detail="Active call not found")
    _require_call_write_access(call, user)
    state = db.query(CallState).filter(CallState.call_id == call_id).first()
    if not state:
        raise HTTPException(status_code=404, detail="Call state not found")
    if payload.action == "mute":
        state.is_muted = True
    elif payload.action == "unmute":
        state.is_muted = False
    elif payload.action == "hold":
        state.is_held = True
    else:
        state.is_held = False
    db.commit()
    return {"call_id": call_id, "is_muted": state.is_muted, "is_held": state.is_held}


@router.get("/calls/{call_id}/supervisor-messages")
def list_supervisor_messages(call_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_read_access(call, user)
    return [{"id": item.id, "supervisor_id": item.supervisor_id, "message": item.message, "created_at": item.created_at}
            for item in db.query(SupervisorMessage).filter(SupervisorMessage.call_id == call_id).order_by(SupervisorMessage.created_at).all()]


@router.post("/calls/{call_id}/supervisor-messages", status_code=status.HTTP_201_CREATED)
def create_supervisor_message(call_id: str, payload: SupervisorWhisperCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")
    call = db.query(Call).filter(Call.id == call_id, Call.status == "active").first()
    if not call:
        raise HTTPException(status_code=404, detail="Active call not found")
    whisper = SupervisorMessage(id=str(uuid4()), call_id=call_id, supervisor_id=user.id, message=payload.message)
    db.add(whisper)
    db.commit()
    return {"id": whisper.id, "supervisor_id": whisper.supervisor_id, "message": whisper.message, "created_at": whisper.created_at}


@router.post("/calls/{call_id}/escalate")
def request_manual_escalation(
    call_id: str,
    payload: EscalationAction,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Allow the assigned agent to request a supervisor without waiting for a rule trigger."""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call or call.status != "active":
        raise HTTPException(status_code=404, detail="Active call not found")
    _require_call_write_access(call, user)
    reason = payload.note.strip() or "Agent requested supervisor assistance"
    alert = (
        db.query(EscalationAlert)
        .filter(EscalationAlert.call_id == call_id, EscalationAlert.status != "resolved")
        .first()
    )
    if not alert:
        alert = EscalationAlert(
            id=str(uuid4()), call_id=call_id, campaign_id=call.campaign_id,
            reason=reason, severity="high",
        )
        db.add(alert)
    db.add(EscalationEvent(
        id=str(uuid4()), alert_id=alert.id, actor_id=user.id,
        action="manual_request", note=reason,
    ))
    db.commit()
    db.refresh(alert)
    return {"id": alert.id, "reason": alert.reason, "severity": alert.severity, "status": alert.status,
            "takeover_requested": alert.takeover_requested}


@router.get("/calls/{call_id}/analysis-prompt", response_model=CallAnalysisPrompt)
def get_analysis_prompt(call_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_read_access(call, user)
    turns = db.query(CallTurn).filter(CallTurn.call_id == call_id).order_by(CallTurn.sequence).all()
    transcript = [{"speaker": turn.speaker, "transcript": turn.transcript} for turn in turns]
    return CallAnalysisPrompt(call_id=call_id, transcript=transcript, prompt=_analysis_prompt(call_id, transcript))


@router.post("/calls/{call_id}/complete")
def complete_call(call_id: str, payload: CallComplete, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_write_access(call, user)
    if call.status != "active":
        raise HTTPException(status_code=409, detail="Only active calls can be completed")
    call.status = "completed"
    call.completed_at = utcnow()
    call.outcome = payload.outcome
    call.summary = payload.summary
    call.analysis_json = json.dumps(payload.analysis or {})
    call.follow_up_recommendation = payload.follow_up_recommendation
    if call.lead_id:
        lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
        if lead:
            lead.summary = payload.summary
            lead.status = "converted" if payload.outcome.lower() in {"converted", "conversion", "won"} else "follow_up"
    db.commit()
    return {"id": call.id, "status": call.status, "outcome": call.outcome, "completed_at": call.completed_at}


@router.get("/calls/{call_id}")
def get_call(call_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    _require_call_read_access(call, user)
    turns = db.query(CallTurn).filter(CallTurn.call_id == call_id).order_by(CallTurn.sequence).all()
    state = db.query(CallState).filter(CallState.call_id == call_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == call.campaign_id).first()
    lead = db.query(Lead).filter(Lead.id == call.lead_id).first() if call.lead_id else None
    return {"id": call.id, "campaign_id": call.campaign_id, "campaign_name": campaign.name if campaign else "Unknown campaign",
            "lead_id": call.lead_id, "lead_name": lead.name if lead else "Unknown lead", "agent_id": call.agent_id, "status": call.status,
            "outcome": call.outcome, "summary": call.summary, "analysis": json.loads(call.analysis_json or "{}"),
            "follow_up_recommendation": call.follow_up_recommendation, "started_at": call.started_at,
            "completed_at": call.completed_at,
            "current_node_id": state.current_node_id if state else None,
            "completed_node_ids": json.loads(state.completed_node_ids_json or "[]") if state else [],
            "is_muted": state.is_muted if state else False,
            "is_held": state.is_held if state else False,
            "takeover_actor_id": state.takeover_actor_id if state else None,
            "turns": [{"sequence": item.sequence, "speaker": item.speaker, "transcript": item.transcript,
                       "occurred_at": item.occurred_at} for item in turns]}


@router.get("/calls")
def list_calls(status_filter: str | None = None, campaign_id: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Call)
    if user.role == "agent":
        query = query.filter(Call.agent_id == user.id)
    elif user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Call access is not available for this role")
    if status_filter:
        query = query.filter(Call.status == status_filter)
    if campaign_id:
        query = query.filter(Call.campaign_id == campaign_id)
    calls = query.order_by(Call.completed_at.desc(), Call.started_at.desc()).all()
    campaign_ids = {call.campaign_id for call in calls}
    lead_ids = {call.lead_id for call in calls if call.lead_id}
    campaigns = db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).all() if campaign_ids else []
    leads = db.query(Lead).filter(Lead.id.in_(lead_ids)).all() if lead_ids else []
    campaign_names = {campaign.id: campaign.name for campaign in campaigns}
    lead_names = {lead.id: lead.name for lead in leads}
    call_ids = {call.id for call in calls}
    states = db.query(CallState).filter(CallState.call_id.in_(call_ids)).all() if call_ids else []
    turns = db.query(CallTurn).filter(CallTurn.call_id.in_(call_ids)).order_by(CallTurn.sequence.desc()).all() if call_ids else []
    alerts = db.query(EscalationAlert).filter(EscalationAlert.call_id.in_(call_ids), EscalationAlert.status != "resolved").all() if call_ids else []
    state_map = {state.call_id: state for state in states}
    latest_turn_map: dict[str, CallTurn] = {}
    for turn in turns:
        latest_turn_map.setdefault(turn.call_id, turn)
    alert_map = {alert.call_id: alert for alert in alerts}
    return [
        {"id": call.id, "campaign_id": call.campaign_id, "campaign_name": campaign_names.get(call.campaign_id, "Unknown campaign"),
         "lead_id": call.lead_id, "lead_name": lead_names.get(call.lead_id, "Unknown lead"), "agent_id": call.agent_id, "status": call.status,
         "outcome": call.outcome, "summary": call.summary, "analysis": json.loads(call.analysis_json or "{}"),
         "follow_up_recommendation": call.follow_up_recommendation, "started_at": call.started_at, "completed_at": call.completed_at,
         "current_node_id": state_map.get(call.id).current_node_id if call.id in state_map else None,
         "is_muted": state_map.get(call.id).is_muted if call.id in state_map else False,
         "is_held": state_map.get(call.id).is_held if call.id in state_map else False,
         "latest_turn": {"speaker": latest_turn_map[call.id].speaker, "transcript": latest_turn_map[call.id].transcript,
                         "occurred_at": latest_turn_map[call.id].occurred_at} if call.id in latest_turn_map else None,
         "escalation": {"id": alert_map[call.id].id, "reason": alert_map[call.id].reason, "severity": alert_map[call.id].severity,
                        "status": alert_map[call.id].status, "takeover_requested": alert_map[call.id].takeover_requested} if call.id in alert_map else None}
        for call in calls
    ]


@router.get("/admin/analytics/campaigns")
def campaign_analytics(db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Track B output contract for Module 7 dashboards, including archived campaigns."""
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    calls = db.query(Call).all()
    metrics = []
    for campaign in campaigns:
        campaign_calls = [call for call in calls if call.campaign_id == campaign.id]
        completed = [call for call in campaign_calls if call.status == "completed"]
        analyses = [json.loads(call.analysis_json or "{}") for call in completed]
        converted = sum(1 for call in completed if (call.outcome or "").lower() in {"converted", "conversion", "won"})
        positive = sum(1 for analysis in analyses if analysis.get("overall_sentiment") == "positive")
        negative = sum(1 for analysis in analyses if analysis.get("overall_sentiment") == "negative")
        escalations = db.query(EscalationAlert).filter(EscalationAlert.campaign_id == campaign.id).count()
        metrics.append({
            "campaign_id": campaign.id, "name": campaign.name, "status": campaign.status,
            "total_calls": len(campaign_calls), "completed_calls": len(completed), "active_calls": sum(1 for call in campaign_calls if call.status == "active"),
            "conversion_rate": round((converted / len(completed)) * 100, 1) if completed else 0,
            "positive_sentiment_rate": round((positive / len(analyses)) * 100, 1) if analyses else 0,
            "negative_sentiment_rate": round((negative / len(analyses)) * 100, 1) if analyses else 0,
            "escalation_count": escalations,
        })
    return metrics


@router.get("/supervisor/campaigns")
def supervisor_campaign_monitor(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Supervisor-safe campaign monitor derived from persisted calls and alerts."""
    if user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")
    campaigns = db.query(Campaign).order_by(Campaign.updated_at.desc()).all()
    calls = db.query(Call).all()
    alerts = db.query(EscalationAlert).filter(EscalationAlert.status != "resolved").all()
    rows = []
    for campaign in campaigns:
        campaign_calls = [call for call in calls if call.campaign_id == campaign.id]
        active_calls = [call for call in campaign_calls if call.status == "active"]
        campaign_alerts = [alert for alert in alerts if alert.campaign_id == campaign.id]
        critical_alerts = sum(1 for alert in campaign_alerts if alert.severity == "critical")
        high_alerts = sum(1 for alert in campaign_alerts if alert.severity == "high")
        risk_score = min(100, (critical_alerts * 55) + (high_alerts * 30) + (max(0, len(campaign_alerts) - critical_alerts - high_alerts) * 12))
        rows.append({
            "campaign_id": campaign.id, "name": campaign.name, "status": campaign.status,
            "total_calls": len(campaign_calls), "active_calls": len(active_calls),
            "unresolved_alerts": len(campaign_alerts), "critical_alerts": critical_alerts,
            "risk_score": risk_score, "updated_at": campaign.updated_at,
        })
    return rows


@router.get("/supervisor/performance")
def supervisor_performance(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Campaign-level performance available to supervisors without admin CRUD access."""
    if user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    calls = db.query(Call).all()
    rows = []
    for campaign in campaigns:
        campaign_calls = [call for call in calls if call.campaign_id == campaign.id]
        completed = [call for call in campaign_calls if call.status == "completed"]
        analyses = [json.loads(call.analysis_json or "{}") for call in completed]
        converted = sum(1 for call in completed if (call.outcome or "").lower() in {"converted", "conversion", "won"})
        positive = sum(1 for analysis in analyses if analysis.get("overall_sentiment") == "positive")
        rows.append({
            "campaign_id": campaign.id, "name": campaign.name, "status": campaign.status,
            "total_calls": len(campaign_calls), "completed_calls": len(completed),
            "conversion_rate": round((converted / len(completed)) * 100, 1) if completed else 0,
            "positive_sentiment_rate": round((positive / len(analyses)) * 100, 1) if analyses else 0,
            "escalation_count": db.query(EscalationAlert).filter(EscalationAlert.campaign_id == campaign.id).count(),
        })
    return rows


@router.get("/admin/leads")
def list_admin_leads(db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Track B output contract for Module 8 CRM screens."""
    leads = db.query(Lead).order_by(Lead.created_at.desc()).all()
    campaigns = {campaign.id: campaign.name for campaign in db.query(Campaign).all()}
    latest_calls: dict[str, Call] = {}
    for call in db.query(Call).filter(Call.lead_id.is_not(None)).order_by(Call.completed_at.desc(), Call.started_at.desc()).all():
        if call.lead_id:
            latest_calls.setdefault(call.lead_id, call)
    return [
        {"id": lead.id, "name": lead.name, "contact": lead.contact, "score": lead.score, "status": lead.status, "assigned_agent_id": lead.assigned_agent_id,
         "campaign_id": lead.campaign_id, "campaign_name": campaigns.get(lead.campaign_id, "Unknown campaign"), "summary": lead.summary,
         "latest_call": {"id": call.id, "outcome": call.outcome, "summary": call.summary,
                         "analysis": json.loads(call.analysis_json or "{}"), "follow_up_recommendation": call.follow_up_recommendation,
                         "completed_at": call.completed_at} if (call := latest_calls.get(lead.id)) else None}
        for lead in leads
    ]


@router.post("/admin/leads", status_code=status.HTTP_201_CREATED)
def create_admin_lead(payload: LeadCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == payload.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status in {"completed", "archived"}:
        raise HTTPException(status_code=409, detail="Completed and archived campaign leads are read-only history")
    if payload.assigned_agent_id:
        assignee = db.query(User).filter(User.id == payload.assigned_agent_id).first()
        if not assignee or assignee.role != "agent" or assignee.status != "active":
            raise HTTPException(status_code=422, detail="Assigned user must be an active agent")
    lead = Lead(id=str(uuid4()), **payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/admin/leads/{lead_id}")
def update_admin_lead(lead_id: str, payload: LeadUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first()
    if campaign and campaign.status in {"completed", "archived"}:
        raise HTTPException(status_code=409, detail="Completed and archived campaign leads are read-only history")
    if payload.assigned_agent_id:
        assignee = db.query(User).filter(User.id == payload.assigned_agent_id).first()
        if not assignee or assignee.role != "agent" or assignee.status != "active":
            raise HTTPException(status_code=422, detail="Assigned user must be an active agent")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/admin/reports/calls.csv")
def export_call_history_csv(db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Export retained call history, including completed and archived campaigns."""
    calls = db.query(Call).order_by(Call.started_at.desc()).all()
    campaign_ids = {call.campaign_id for call in calls}
    lead_ids = {call.lead_id for call in calls if call.lead_id}
    campaigns = db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).all() if campaign_ids else []
    leads = db.query(Lead).filter(Lead.id.in_(lead_ids)).all() if lead_ids else []
    campaign_map = {campaign.id: campaign for campaign in campaigns}
    lead_map = {lead.id: lead for lead in leads}
    escalation_counts = {
        campaign_id: db.query(EscalationAlert).filter(EscalationAlert.campaign_id == campaign_id).count()
        for campaign_id in campaign_ids
    }

    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "campaign_id", "campaign_name", "campaign_status", "lead_id", "lead_name", "lead_contact",
        "call_id", "call_status", "started_at", "completed_at", "outcome", "summary",
        "start_sentiment", "end_sentiment", "overall_sentiment", "intent", "toxic_language_findings",
        "objections", "extracted_lead_details", "follow_up_recommendation", "campaign_escalation_count",
    ])
    writer.writeheader()
    for call in calls:
        campaign = campaign_map.get(call.campaign_id)
        lead = lead_map.get(call.lead_id) if call.lead_id else None
        analysis = json.loads(call.analysis_json or "{}")
        writer.writerow({
            "campaign_id": call.campaign_id,
            "campaign_name": campaign.name if campaign else "Unknown campaign",
            "campaign_status": campaign.status if campaign else "unknown",
            "lead_id": call.lead_id or "",
            "lead_name": lead.name if lead else "",
            "lead_contact": lead.contact if lead else "",
            "call_id": call.id,
            "call_status": call.status,
            "started_at": call.started_at.isoformat() if call.started_at else "",
            "completed_at": call.completed_at.isoformat() if call.completed_at else "",
            "outcome": call.outcome or "",
            "summary": call.summary or "",
            "start_sentiment": analysis.get("start_sentiment", ""),
            "end_sentiment": analysis.get("end_sentiment", ""),
            "overall_sentiment": analysis.get("overall_sentiment", ""),
            "intent": analysis.get("intent", ""),
            "toxic_language_findings": json.dumps(analysis.get("toxic_language", analysis.get("toxic_language_findings", []))),
            "objections": json.dumps(analysis.get("objections", [])),
            "extracted_lead_details": json.dumps(analysis.get("extracted_lead_details", {})),
            "follow_up_recommendation": call.follow_up_recommendation or "",
            "campaign_escalation_count": escalation_counts.get(call.campaign_id, 0),
        })
    filename = f"echoai-call-history-{utcnow().date().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/supervisor/alerts")
def list_alerts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")
    alerts = db.query(EscalationAlert).order_by(EscalationAlert.created_at.desc()).all()
    return [
        {
            "id": alert.id, "call_id": alert.call_id, "campaign_id": alert.campaign_id,
            "reason": alert.reason, "severity": alert.severity, "status": alert.status,
            "takeover_requested": alert.takeover_requested, "acknowledged_at": alert.acknowledged_at,
            "resolved_at": alert.resolved_at, "resolution_note": alert.resolution_note,
            "created_at": alert.created_at,
            "events": [
                {"id": event.id, "actor_id": event.actor_id, "action": event.action, "note": event.note, "created_at": event.created_at}
                for event in db.query(EscalationEvent).filter(EscalationEvent.alert_id == alert.id).order_by(EscalationEvent.created_at.desc()).all()
            ],
        }
        for alert in alerts
    ]


@router.post("/supervisor/alerts/{alert_id}/{action}")
def update_alert(alert_id: str, action: str, payload: EscalationAction, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in {"admin", "supervisor"} or action not in {"acknowledge", "resolve", "takeover"}:
        raise HTTPException(status_code=403, detail="Supervisor action required")
    alert = db.query(EscalationAlert).filter(EscalationAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if action == "takeover":
        if alert.status == "resolved":
            raise HTTPException(status_code=409, detail="Resolved alerts cannot be taken over")
        alert.takeover_requested = True
        call_state = db.query(CallState).filter(CallState.call_id == alert.call_id).first()
        if call_state:
            call_state.takeover_actor_id = user.id
    elif action == "acknowledge":
        if alert.status != "new":
            raise HTTPException(status_code=409, detail="Only new alerts can be acknowledged")
        alert.status = "acknowledged"
        alert.acknowledged_at = utcnow()
    else:
        if alert.status == "resolved":
            raise HTTPException(status_code=409, detail="Alert is already resolved")
        alert.status = "resolved"
        alert.resolved_at = utcnow()
        alert.resolution_note = payload.note
    db.add(EscalationEvent(id=str(uuid4()), alert_id=alert.id, actor_id=user.id, action=action, note=payload.note))
    db.commit()
    return {"id": alert.id, "status": alert.status, "takeover_requested": alert.takeover_requested,
            "acknowledged_at": alert.acknowledged_at, "resolved_at": alert.resolved_at, "resolution_note": alert.resolution_note}


@router.get("/knowledge")
def list_knowledge(campaign_id: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(KnowledgeEntry)
    if user.role == "agent":
        assigned_campaign_ids = db.query(Lead.campaign_id).filter(Lead.assigned_agent_id == user.id).distinct()
        if campaign_id:
            if not db.query(Lead).filter(Lead.assigned_agent_id == user.id, Lead.campaign_id == campaign_id).first():
                raise HTTPException(status_code=403, detail="You do not have access to this campaign knowledge")
            query = query.filter((KnowledgeEntry.campaign_id == campaign_id) | (KnowledgeEntry.campaign_id.is_(None)))
        else:
            query = query.filter((KnowledgeEntry.campaign_id.is_(None)) | (KnowledgeEntry.campaign_id.in_(assigned_campaign_ids)))
    elif campaign_id:
        query = query.filter((KnowledgeEntry.campaign_id == campaign_id) | (KnowledgeEntry.campaign_id.is_(None)))
    return query.order_by(KnowledgeEntry.updated_at.desc()).all()


@router.post("/knowledge", status_code=status.HTTP_201_CREATED)
def create_knowledge(payload: KnowledgeCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    _ensure_knowledge_campaign_editable(db, payload.campaign_id)
    entry = KnowledgeEntry(id=str(uuid4()), **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/knowledge/{entry_id}")
def update_knowledge(entry_id: str, payload: KnowledgeUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    _ensure_knowledge_campaign_editable(db, entry.campaign_id)
    if "campaign_id" in payload.model_fields_set:
        _ensure_knowledge_campaign_editable(db, payload.campaign_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/knowledge/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge(entry_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    _ensure_knowledge_campaign_editable(db, entry.campaign_id)
    db.delete(entry)
    db.commit()
    return None
