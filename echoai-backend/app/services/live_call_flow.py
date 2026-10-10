"""Shared Module 3B state access for real-time voice calls.

This service deliberately reads the activated campaign snapshot rather than a
mutable source script, so an in-flight call always follows its original plan.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.operations import Call, CallState, CallTurn
from app.models.script import Script
from app.core.time import utcnow
from app.models.voice_turn_receipt import VoiceTurnReceipt


_CLARIFICATION_PREFIXES = (
    "what", "why", "how", "when", "where", "who", "can you", "could you",
    "would you", "tell me", "explain", "sorry", "pardon", "repeat",
)
_OBJECTION_TERMS = (
    "not interested", "too expensive", "no budget", "don't want", "do not want",
    "busy", "stop calling", "remove me", "unsubscribe", "not now",
)
_UNCERTAIN_TERMS = (
    "i don't know", "i dont know", "not sure", "maybe", "perhaps", "no idea",
)
_AFFIRMATIVE_TERMS = (
    "yes", "yeah", "yep", "sure", "okay", "ok", "interested", "sounds good",
    "let's do it", "lets do it", "book", "schedule", "sign me up", "go ahead",
)
_GENERIC_GOAL_WORDS = {
    "ask", "about", "and", "brief", "call", "current", "customer", "details",
    "discover", "find", "for", "from", "gain", "goal", "how", "learn", "more",
    "need", "needs", "out", "the", "their", "them", "understand", "what", "with",
}
_WORKFLOW_EVIDENCE = {
    "agent", "agents", "calls", "campaign", "crm", "email", "follow", "lead", "leads",
    "manual", "people", "process", "sales", "sheet", "sheets", "spreadsheet", "spreadsheets",
    "support", "team", "teams", "track", "tracking", "workflow", "workflows",
}


@dataclass(frozen=True)
class StageTransition:
    """The result of one customer turn's conservative stage evaluation."""

    advanced: bool
    previous_node_id: str | None
    current_node_id: str | None
    reason: str


def _json_list(value: str | None) -> list:
    try:
        result = json.loads(value or "[]")
        return result if isinstance(result, list) else []
    except (TypeError, ValueError, json.JSONDecodeError):
        return []


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _word_set(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", _normalise(text)))


def _node_evidence_terms(node: dict) -> set[str]:
    """Read optional authored completion evidence without breaking older scripts."""
    values: list[str] = []
    for key in ("goal_evidence", "completion_keywords", "evidence_keywords", "required_keywords"):
        value = node.get(key, [])
        values.extend(value if isinstance(value, list) else [str(value)])
    return {word for value in values for word in _word_set(str(value)) if len(word) > 2}


def _branch_for_customer_evidence(current: dict, nodes: list[dict], words: set[str]) -> str | None:
    """Choose only an explicitly evidenced outgoing branch; ambiguity stays put."""
    matches: list[str] = []
    for target_id in (str(value) for value in current.get("next_node_ids", [])):
        target = next((node for node in nodes if str(node.get("id")) == target_id), None)
        if not target:
            continue
        terms = _node_evidence_terms(target)
        if terms and terms & words:
            matches.append(target_id)
    return matches[0] if len(matches) == 1 else None


def customer_satisfies_goal(node: dict | None, customer_text: str, history: list[dict]) -> bool:
    """Return true only for conservative, customer-provided completion evidence.

    Script goals are authored as free text, not executable conditions.  This
    intentionally errs on retaining the current node: questions, objections,
    and short/ambiguous answers never progress a call.  The worker may supply
    a valid branch target, but it cannot bypass this evidence gate.
    """

    if not node:
        return False
    text = _normalise(customer_text)
    if not text or len(re.findall(r"[a-z0-9]+", text)) < 2:
        return False
    if "?" in customer_text or text.startswith(_CLARIFICATION_PREFIXES):
        return False
    if any(term in text for term in _OBJECTION_TERMS):
        return False
    if any(term in text for term in _UNCERTAIN_TERMS):
        return False

    node_type = str(node.get("type", "")).lower()
    words = _word_set(text)
    affirmative = any(term in text for term in _AFFIRMATIVE_TERMS)
    substantive = len(words) >= 4
    # An opening is delivered by EchoAI; a customer reply alone must not mark
    # the agent's introduction as delivered or complete.
    if node_type == "opening":
        return False
    if node_type == "discovery":
        # Prefer explicit evidence authored on new scripts.  Existing scripts
        # have only free-text goals, so require meaningful overlap with their
        # goal/prompt or a concrete workflow description--never word count.
        evidence = _node_evidence_terms(node)
        if evidence:
            return bool(evidence & words)
        authored_terms = {
            word for word in _word_set(f"{node.get('goal', '')} {node.get('prompt', '')}")
            if len(word) > 2 and word not in _GENERIC_GOAL_WORDS
        }
        return bool(authored_terms & words) or bool(_WORKFLOW_EVIDENCE & words)
    if node_type in {"pitch", "closing"}:
        return affirmative
    if node_type == "objection":
        return affirmative and substantive

    # For future node types, require either a meaningful confirmation or
    # overlap with the authored goal and a substantive customer response.
    goal_words = {
        word for word in re.findall(r"[a-z0-9]+", _normalise(str(node.get("goal", ""))))
        if len(word) > 2
    }
    return substantive and (affirmative or bool(goal_words & words))


def script_nodes(campaign: Campaign, db: Session) -> list[dict]:
    """Return ordered nodes from the immutable active-campaign snapshot."""
    try:
        snapshot = json.loads(campaign.script_snapshot_json or "{}")
        payload = json.loads(snapshot.get("content", "{}"))
        nodes = payload.get("nodes", []) if isinstance(payload, dict) else payload
        if isinstance(nodes, list):
            return [node for node in nodes if isinstance(node, dict)]
    except (TypeError, ValueError, json.JSONDecodeError):
        pass
    script = db.query(Script).filter(Script.id == campaign.script_id).first()
    try:
        payload = json.loads(script.content if script else "{}")
        return payload.get("nodes", []) if isinstance(payload, dict) else payload
    except (TypeError, ValueError, json.JSONDecodeError):
        return []


def call_context(db: Session, call: Call) -> dict:
    """Build compact, trusted script context for one isolated live call."""
    campaign = db.query(Campaign).filter(Campaign.id == call.campaign_id).first()
    state = db.query(CallState).filter(CallState.call_id == call.id).first()
    if not campaign or not state:
        raise ValueError("Active call campaign state is unavailable")
    nodes = script_nodes(campaign, db)
    current = next((node for node in nodes if node.get("id") == state.current_node_id), None)
    turns = db.query(CallTurn).filter(CallTurn.call_id == call.id).order_by(CallTurn.sequence.desc()).limit(8).all()
    history = [{"speaker": turn.speaker, "text": turn.transcript} for turn in reversed(turns)]
    # Reuse the established operations retrieval policy: campaign-scoped
    # published material wins over global material.  The latest customer turn
    # is the most relevant query for a live answer.
    from app.api.routes.operations import _match_objection, _retrieve_knowledge
    latest_customer_text = next((item["text"] for item in reversed(history) if item["speaker"] == "customer"), "")
    knowledge = _retrieve_knowledge(db, campaign.id, latest_customer_text)
    objection = _match_objection(db, campaign.script_id, state.current_node_id, latest_customer_text)
    return {
        "campaign": {"product": campaign.product, "audience": campaign.audience, "goal": campaign.goal, "context": campaign.context},
        "current_node": current,
        "history": history,
        "approved_knowledge": knowledge,
        "approved_objection_response": objection.approved_response if objection else "",
        "opening_delivered": db.query(VoiceTurnReceipt).filter_by(
            call_id=call.id, speaker="ai", worker_turn_id="0",
        ).first() is not None,
    }


def transition_customer_stage(
    db: Session,
    call: Call,
    customer_text: str,
    *,
    requested_next_node_id: str | None = None,
) -> StageTransition:
    """Move one call through its frozen graph after verified customer evidence.

    The state row is locked for the duration of the transaction.  The caller
    owns committing or rolling back so the turn, memory update, receipt and
    transition are atomic.
    """

    state = (
        db.query(CallState)
        .filter(CallState.call_id == call.id)
        .with_for_update()
        .first()
    )
    campaign = db.query(Campaign).filter(Campaign.id == call.campaign_id).first()
    if not state or not campaign:
        return StageTransition(False, None, None, "call state is unavailable")
    nodes = script_nodes(campaign, db)
    current = next((node for node in nodes if node.get("id") == state.current_node_id), None)
    previous_node_id = state.current_node_id
    if not customer_satisfies_goal(current, customer_text, _json_list(state.recent_memory_json)):
        return StageTransition(False, previous_node_id, previous_node_id, "customer evidence did not satisfy the current goal")

    allowed = [str(node_id) for node_id in (current or {}).get("next_node_ids", [])]
    if not allowed:
        return StageTransition(False, previous_node_id, previous_node_id, "current node has no valid next transition")
    if requested_next_node_id and requested_next_node_id not in allowed:
        return StageTransition(False, previous_node_id, previous_node_id, "requested transition is not in frozen script")
    if requested_next_node_id:
        next_node_id = requested_next_node_id
    elif len(allowed) == 1:
        next_node_id = allowed[0]
    else:
        next_node_id = _branch_for_customer_evidence(current or {}, nodes, _word_set(customer_text))
        if not next_node_id:
            return StageTransition(False, previous_node_id, previous_node_id, "branch intent is ambiguous")
    if not any(node.get("id") == next_node_id for node in nodes):
        return StageTransition(False, previous_node_id, previous_node_id, "frozen script target is unavailable")

    completed = _json_list(state.completed_node_ids_json)
    if previous_node_id and previous_node_id not in completed:
        completed.append(previous_node_id)
    state.completed_node_ids_json = json.dumps(completed)
    state.current_node_id = next_node_id
    return StageTransition(True, previous_node_id, next_node_id, "customer evidence satisfied the current goal")


def persist_customer_turn(
    db: Session,
    call: Call,
    *,
    text: str,
    worker_turn_id: str,
    requested_next_node_id: str | None = None,
) -> tuple[CallTurn, StageTransition, bool]:
    """Persist an STT-final turn and its graph transition exactly once.

    A worker turn ID, not transcript text, is the idempotency key, allowing a
    customer to legitimately repeat the same phrase on later turns.
    """

    receipt = (
        db.query(VoiceTurnReceipt)
        .filter_by(call_id=call.id, speaker="customer", worker_turn_id=worker_turn_id)
        .first()
    )
    if receipt:
        turn = db.query(CallTurn).filter(CallTurn.id == receipt.call_turn_id).first()
        if not turn:
            raise ValueError("customer turn receipt points to a missing turn")
        return turn, StageTransition(False, None, None, "duplicate worker turn"), True

    # Lock the state before selecting a sequence so two concurrent finalized
    # STT callbacks cannot produce a duplicate sequence or transition.
    state = db.query(CallState).filter(CallState.call_id == call.id).with_for_update().first()
    if not state:
        raise ValueError("call state is unavailable")
    latest = db.query(func.max(CallTurn.sequence)).filter(CallTurn.call_id == call.id).scalar()
    turn = CallTurn(
        id=str(uuid4()), call_id=call.id, sequence=(latest + 1 if latest is not None else 0),
        speaker="customer", transcript=text, occurred_at=utcnow(),
    )
    db.add(turn)
    memory = _json_list(state.recent_memory_json)
    memory.append({"speaker": "customer", "text": text})
    state.recent_memory_json = json.dumps(memory[-8:])
    transition = transition_customer_stage(
        db, call, text, requested_next_node_id=requested_next_node_id,
    )
    db.add(VoiceTurnReceipt(
        id=str(uuid4()), call_id=call.id, speaker="customer",
        worker_turn_id=worker_turn_id, call_turn_id=turn.id,
    ))
    try:
        db.commit()
    except IntegrityError:
        # A competing callback inserted the same receipt.  Roll back and use
        # its persisted turn rather than applying a second transition.
        db.rollback()
        receipt = db.query(VoiceTurnReceipt).filter_by(
            call_id=call.id, speaker="customer", worker_turn_id=worker_turn_id,
        ).first()
        if receipt:
            stored = db.query(CallTurn).filter(CallTurn.id == receipt.call_turn_id).first()
            if stored:
                return stored, StageTransition(False, None, None, "duplicate worker turn"), True
        raise
    return turn, transition, False


def persist_ai_turn(
    db: Session, call: Call, *, text: str, worker_turn_id: str,
) -> tuple[CallTurn, bool]:
    """Persist an audio-completed AI turn exactly once."""

    receipt = db.query(VoiceTurnReceipt).filter_by(
        call_id=call.id, speaker="ai", worker_turn_id=worker_turn_id,
    ).first()
    if receipt:
        turn = db.query(CallTurn).filter(CallTurn.id == receipt.call_turn_id).first()
        if not turn:
            raise ValueError("AI turn receipt points to a missing turn")
        return turn, True
    db.query(CallState).filter(CallState.call_id == call.id).with_for_update().first()
    latest = db.query(func.max(CallTurn.sequence)).filter(CallTurn.call_id == call.id).scalar()
    turn = CallTurn(
        id=str(uuid4()), call_id=call.id, sequence=(latest + 1 if latest is not None else 0),
        speaker="ai", transcript=text, occurred_at=utcnow(),
    )
    db.add_all([
        turn,
        VoiceTurnReceipt(id=str(uuid4()), call_id=call.id, speaker="ai", worker_turn_id=worker_turn_id, call_turn_id=turn.id),
    ])
    if worker_turn_id == "0":
        # The outbound greeting may complete the opening node, but only here:
        # this endpoint is invoked after the TTS stream reports final audio,
        # never when Groq merely generated text.
        _complete_delivered_opening(db, call)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        receipt = db.query(VoiceTurnReceipt).filter_by(
            call_id=call.id, speaker="ai", worker_turn_id=worker_turn_id,
        ).first()
        if receipt:
            stored = db.query(CallTurn).filter(CallTurn.id == receipt.call_turn_id).first()
            if stored:
                return stored, True
        raise
    return turn, False


def _complete_delivered_opening(db: Session, call: Call) -> None:
    """Advance an outbound opening once its audio delivery is confirmed."""

    state = db.query(CallState).filter(CallState.call_id == call.id).with_for_update().first()
    campaign = db.query(Campaign).filter(Campaign.id == call.campaign_id).first()
    if not state or not campaign:
        return
    current = next((node for node in script_nodes(campaign, db) if node.get("id") == state.current_node_id), None)
    if not current or current.get("type") != "opening":
        return
    allowed = [str(node_id) for node_id in current.get("next_node_ids", [])]
    if not allowed:
        return
    completed = _json_list(state.completed_node_ids_json)
    if state.current_node_id not in completed:
        completed.append(state.current_node_id)
    state.completed_node_ids_json = json.dumps(completed)
    state.current_node_id = allowed[0]
