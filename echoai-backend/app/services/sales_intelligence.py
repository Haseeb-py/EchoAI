"""Fast, explainable Module 5 objection and buying-signal decisions.

This deliberately contains no campaign/product vocabulary. Product claims stay
inside the campaign-scoped approved-knowledge path already used by Module 3B.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass
from time import perf_counter
from uuid import uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.operations import Call, CallTurn
from app.models.sales import CallSalesSummary, TurnSalesIntelligence

CLASSIFIER_VERSION = "sales-rule-baseline-v1"

_OBJECTIONS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("price_budget", ("too expensive", "sounds expensive", "sound expensive", "can't afford", "cannot afford", "no budget", "out of budget", "cost is too high", "price is too high", "price is high", "price seems high", "too costly", "budget is limited", "how much does it cost", "waste my money", "not worth the money")),
    ("trust_credibility", ("don't trust", "do not trust", "sounds like a scam", "prove it", "are you legitimate", "not convinced", "can i trust", "how do i know", "is this reliable", "any reviews", "your credentials", "deliver what they promise", "might not work", "won't deliver", "will not deliver")),
    ("timing_urgency", ("not now", "bad time", "too busy", "call later", "not a priority", "maybe later")),
    ("authority_decision_maker", ("need to ask", "need approval", "not the decision maker", "my manager", "my boss", "my partner")),
    ("product_service_fit", ("not a fit", "doesn't fit", "does not fit", "already have", "we use", "not what we need", "won't work", "will not work")),
    ("hesitation_uncertainty", ("not sure", "i don't know", "i dont know", "maybe", "need to think", "let me think", "hesitant")),
)
_REFUSAL = ("stop calling", "do not call", "don't call", "remove me", "unsubscribe", "not interested", "no thanks")
_CONFIRMED = ("sign me up", "let's proceed", "lets proceed", "i want to buy", "i'll take it", "ill take it", "go ahead with it", "ready to proceed", "want to go ahead", "have decided", "i decided", "ready to book", "would like to proceed")
_INTEREST = ("interested", "interesting", "tell me more", "learn more", "would like to learn", "how do i start", "how do we start", "what are the next steps", "send me details", "sounds good")


@dataclass(frozen=True)
class SalesDecision:
    objection_type: str
    objection_confidence: float
    buying_signal: str
    buying_confidence: float
    commitment_confirmed: bool
    recommended_strategy: str
    evidence: tuple[str, ...]
    inference_ms: float
    objection_types: tuple[str, ...] = ()
    upsell_suggestions: tuple[str, ...] = ()


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _matches(text: str, phrases: tuple[str, ...]) -> list[str]:
    return [phrase for phrase in phrases if re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", text)]


def _strategy(objection: str, buying: str, committed: bool, cognitive: object | None) -> str:
    # Strategy is behavioral guidance only; it never supplies business facts.
    if objection == "refusal":
        return "Respect the stop-contact or refusal immediately. Do not persuade, continue discovery, or make another offer."
    if objection == "price_budget":
        return "Acknowledge the budget concern. Use approved knowledge only; do not invent price, discounts, or terms. Ask one concise clarifying question only if appropriate."
    if objection == "trust_credibility":
        return "Acknowledge the trust concern calmly. Offer only verifiable approved facts and do not make guarantees."
    if objection == "timing_urgency":
        return "Acknowledge the timing concern without pressure. Ask whether another approved next step is preferred only if the customer has not declined contact."
    if objection == "authority_decision_maker":
        return "Acknowledge the decision process. Do not assume authority or force a close; provide approved information for the customer to evaluate."
    if objection == "product_service_fit":
        return "Clarify the stated fit concern using approved facts. If fit cannot be established from approved knowledge, say so briefly."
    if objection == "hesitation_uncertainty":
        return "Clarify the concern in plain language and answer the direct question before returning to the current script stage."
    if committed:
        return "Acknowledge the stated willingness to proceed. Confirm only the next step supported by the current approved script; do not claim a sale is complete."
    if buying == "interest":
        return "Acknowledge interest, answer the customer directly with approved information, then continue the current approved stage without prematurely closing."
    if cognitive and getattr(cognitive, "emotion", "") in {"angry", "frustrated", "uncertain"}:
        return "Keep the response concise, calm, and empathetic. Resolve the direct concern with approved information before returning to the script."
    return "Answer the customer's direct concern first with approved knowledge, then continue the current frozen script stage if appropriate."


def _grounded_upsells(knowledge: list[dict] | None, objection: str, cognitive: object | None) -> tuple[str, ...]:
    if objection != "none" or (cognitive and getattr(cognitive, "emotion", "") in {"angry", "frustrated", "uncertain"}):
        return ()
    suggestions = []
    for item in knowledge or []:
        category = str(item.get("category", "")).lower().replace("-", "_")
        if category in {"upsell", "cross_sell", "add_on", "add_on_service"}:
            content = str(item.get("content", "")).strip()
            if content: suggestions.append(content)
    return tuple(suggestions[:2])

def detect_sales_decision(text: str, cognitive: object | None = None, knowledge: list[dict] | None = None) -> SalesDecision:
    started = perf_counter()
    normalized = _normalise(text)
    refusal = _matches(normalized, _REFUSAL)
    objection_type, matches, all_types, all_evidence = "none", [], [], []
    if refusal:
        objection_type, matches = "refusal", refusal
    else:
        for category, phrases in _OBJECTIONS:
            found = _matches(normalized, phrases)
            if found:
                all_types.append(category)
                all_evidence.extend(found)
                if objection_type == "none": objection_type, matches = category, found
    confirmed = [] if refusal else _matches(normalized, _CONFIRMED)
    interest = [] if refusal or confirmed else _matches(normalized, _INTEREST)
    buying_signal = "commitment" if confirmed else "interest" if interest else "none"
    evidence = tuple((refusal or all_evidence) + confirmed + interest)
    return SalesDecision(
        objection_type=objection_type,
        objection_confidence=min(0.95, 0.55 + len(matches) * 0.2) if matches else 0.0,
        buying_signal=buying_signal,
        buying_confidence=0.9 if confirmed else min(0.85, 0.55 + len(interest) * 0.2) if interest else 0.0,
        commitment_confirmed=bool(confirmed),
        recommended_strategy=_strategy(objection_type, buying_signal, bool(confirmed), cognitive),
        evidence=evidence,
        objection_types=tuple(["refusal"] if refusal else all_types),
        upsell_suggestions=_grounded_upsells(knowledge, objection_type, cognitive),
        inference_ms=round((perf_counter() - started) * 1000, 3),
    )


def as_payload(record: TurnSalesIntelligence) -> dict[str, object]:
    try:
        evidence = json.loads(record.evidence_json or "[]")
    except (TypeError, ValueError, json.JSONDecodeError):
        evidence = []
    return {"call_id": record.call_id, "call_turn_id": record.call_turn_id,
            "objection_type": record.objection_type, "objection_confidence": record.objection_confidence,
            "buying_signal": record.buying_signal, "buying_confidence": record.buying_confidence,
            "commitment_confirmed": record.commitment_confirmed,
            "recommended_strategy": record.recommended_strategy, "evidence": evidence,
            "objection_types": json.loads(record.objection_types_json or "[]"), "upsell_suggestions": json.loads(record.upsell_json or "[]"),
            "classifier_version": record.classifier_version, "inference_ms": record.inference_ms}


def persist_turn_sales_intelligence(db: Session, call: Call, turn: CallTurn, cognitive: object | None = None, knowledge: list[dict] | None = None, *, commit: bool = True) -> tuple[TurnSalesIntelligence, bool]:
    existing = db.query(TurnSalesIntelligence).filter(TurnSalesIntelligence.call_turn_id == turn.id).first()
    if existing:
        return existing, True
    decision = detect_sales_decision(turn.transcript, cognitive, knowledge)
    record = TurnSalesIntelligence(id=str(uuid4()), call_id=call.id, call_turn_id=turn.id,
        objection_type=decision.objection_type, objection_confidence=decision.objection_confidence,
        buying_signal=decision.buying_signal, buying_confidence=decision.buying_confidence,
        commitment_confirmed=decision.commitment_confirmed, recommended_strategy=decision.recommended_strategy,
        evidence_json=json.dumps(list(decision.evidence)), objection_types_json=json.dumps(list(decision.objection_types)), upsell_json=json.dumps(list(decision.upsell_suggestions)), classifier_version=CLASSIFIER_VERSION,
        inference_ms=decision.inference_ms)
    db.add(record)
    if commit:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            stored = db.query(TurnSalesIntelligence).filter(TurnSalesIntelligence.call_turn_id == turn.id).first()
            if stored:
                return stored, True
            raise
    return record, False


def latest_turn_sales_intelligence(db: Session, call_id: str) -> TurnSalesIntelligence | None:
    return db.query(TurnSalesIntelligence).filter(TurnSalesIntelligence.call_id == call_id).order_by(TurnSalesIntelligence.created_at.desc()).first()


def aggregate_call_sales_intelligence(db: Session, call: Call) -> CallSalesSummary:
    rows = db.query(TurnSalesIntelligence).filter(TurnSalesIntelligence.call_id == call.id).order_by(TurnSalesIntelligence.created_at).all()
    objections = []
    for row in rows:
        try: types = json.loads(row.objection_types_json or "[]")
        except (TypeError, ValueError, json.JSONDecodeError): types = []
        objections.extend(kind for kind in (types or [row.objection_type]) if kind not in {"none", "refusal"})
    signals = [row.buying_signal for row in rows if row.buying_signal != "none"]
    summary = db.get(CallSalesSummary, call.id) or CallSalesSummary(call_id=call.id)
    if not db.get(CallSalesSummary, call.id):
        db.add(summary)
    summary.objection_count = len(objections)
    summary.primary_objection = Counter(objections).most_common(1)[0][0] if objections else "none"
    summary.buying_signal_count = len(signals)
    summary.highest_buying_signal = "commitment" if any(row.commitment_confirmed for row in rows) else "interest" if signals else "none"
    summary.commitment_confirmed = any(row.commitment_confirmed for row in rows)
    try:
        analysis = json.loads(call.analysis_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        analysis = {}
    analysis["sales"] = {"objection_count": summary.objection_count, "primary_objection": summary.primary_objection,
        "buying_signal_count": summary.buying_signal_count, "highest_buying_signal": summary.highest_buying_signal,
        "commitment_confirmed": summary.commitment_confirmed}
    call.analysis_json = json.dumps(analysis)
    db.commit()
    return summary
