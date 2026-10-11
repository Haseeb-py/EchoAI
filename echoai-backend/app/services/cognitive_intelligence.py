"""Low-latency, explainable Module 4 text intelligence.

The live path deliberately uses a bounded rule baseline. VADER is used when
installed, but intent and emotion remain explicit EchoAI rules rather than
being misrepresented as VADER capabilities.
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

from app.models.cognitive import CallExperience, TurnIntelligence
from app.models.operations import Call, CallTurn

CLASSIFIER_VERSION = "vader-rule-baseline-v1"

try:  # Optional until the dependency is installed in an existing deployment.
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
except ImportError:  # pragma: no cover - exercised by environments without VADER
    SentimentIntensityAnalyzer = None

_VADER = SentimentIntensityAnalyzer() if SentimentIntensityAnalyzer is not None else None


_INTENTS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("opt_out", ("stop calling", "do not call", "don't call", "don't contact me", "do not contact me", "remove me", "remove me from your list", "unsubscribe", "not interested", "no thanks", "bye")),
    ("human_support", ("human", "supervisor", "real person", "speak to someone")),
    # Keep this taxonomy campaign-agnostic. Campaign/domain concepts belong in
    # frozen campaign knowledge and Groq context, not this shared baseline.
    ("support_request", ("need help", "need assistance", "can you help", "help me", "having an issue", "having trouble", "problem with")),
    ("pricing", ("price", "pricing", "cost", "budget", "expensive", "fee")),
    ("product_question", ("what is", "what does", "how does", "tell me about", "explain")),
    ("schedule", ("schedule a", "schedule an", "book a", "book an", "book appointment", "callback", "call me", "set up a time", "arrange a call")),
    ("purchase_interest", ("interested", "sign up", "get started", "let's do it", "lets do it", "buy")),
    ("complaint", ("nobody has fixed", "nobody has resolved", "still unresolved", "bad service", "file a complaint")),
    ("objection", ("not interested", "no thanks", "too expensive", "not now", "already use")),
    ("clarification", ("repeat", "what do you mean", "can you clarify", "could you clarify")),
)
_EMOTIONS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("angry", ("angry", "furious", "ridiculous", "terrible", "worst", "useless")),
    ("uncertain", ("worried", "worry", "might lose", "not sure", "maybe", "i don't know", "i dont know", "confused")),
    ("frustrated", ("frustrated", "annoyed", "upset", "fed up", "stop", "again")),
    ("interested", ("interested", "sounds good", "tell me more", "yes", "great")),
    ("calm", ("thank you", "thanks", "okay", "alright", "fine")),
)
_POSITIVE = {"great", "good", "helpful", "thanks", "thank", "interested", "excellent", "love"}
_NEGATIVE = {"angry", "bad", "terrible", "frustrated", "annoyed", "hate", "useless", "ridiculous", "expensive"}
_CONCERN_TERMS = ("expensive", "costly", "waste my money", "might not work", "don't trust", "do not trust", "worried", "not sure", "skeptical", "not convinced")


@dataclass(frozen=True)
class CognitiveResult:
    intent: str
    intent_confidence: float
    sentiment: str
    sentiment_score: float
    emotion: str
    emotion_confidence: float
    response_guidance: str
    classifier_version: str
    inference_ms: float


def _text(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()


def _first_match(text: str, options: tuple[tuple[str, tuple[str, ...]], ...]) -> tuple[str, float]:
    for label, phrases in options:
        # Match whole words/phrases.  A raw substring made "leadbook" look
        # like the scheduling word "book" in a real Laptop Repair call.
        matches = sum(1 for phrase in phrases if re.search(r"(?<!\\w)" + re.escape(phrase) + r"(?!\\w)", text))
        if matches:
            return label, min(0.95, 0.55 + (matches * 0.2))
    return "unknown", 0.0


def _sentiment(text: str) -> tuple[str, float, str]:
    if _VADER is not None:
        compound = float(_VADER.polarity_scores(text)["compound"])
        label = "positive" if compound >= 0.2 else "negative" if compound <= -0.2 else "neutral"
        if any(term in text for term in _CONCERN_TERMS) and compound >= -0.2:
            return "negative", min(compound, -0.25), CLASSIFIER_VERSION
        return label, compound, CLASSIFIER_VERSION
    words = set(re.findall(r"[a-z]+", text))
    positive = len(words & _POSITIVE)
    negative = len(words & _NEGATIVE)
    score = max(-1.0, min(1.0, (positive - negative) / max(1, positive + negative)))
    label = "positive" if score > 0 else "negative" if score < 0 else "neutral"
    return label, score, "rule-baseline-v1"


def response_guidance(intent: str, sentiment: str, emotion: str) -> str:
    if intent == "opt_out":
        return "Respect the opt-out immediately. Do not persuade, continue discovery, or make new offers."
    if emotion == "angry":
        return "Be brief, calm, and empathetic. Acknowledge the concern without making promises or pressure."
    if emotion == "uncertain" or intent == "clarification":
        return "Clarify in plain language, reassure only with approved facts, then gently resume the current stage."
    if sentiment == "negative":
        return "Be brief, calm, and empathetic. Acknowledge the concern without making promises or pressure."
    if emotion == "frustrated":
        return "Use a concise, patient clarification. Avoid repeating the same question and avoid pressure."
    if emotion == "interested" or intent == "purchase_interest":
        return "Maintain a helpful, confident tone and continue only with the current approved script stage."
    return "Use the campaign persona and current script stage. Answer direct customer questions before continuing the script."


def detect_customer_text(text: str) -> CognitiveResult:
    started = perf_counter()
    normalized = _text(text)
    intent, intent_confidence = _first_match(normalized, _INTENTS)
    emotion, emotion_confidence = _first_match(normalized, _EMOTIONS)
    sentiment, sentiment_score, version = _sentiment(normalized)
    if intent == "opt_out":
        # "not interested" must never become interest because of the shared
        # word; a refusal is a customer instruction, not an emotion signal.
        emotion, emotion_confidence = "unknown", 0.0
        sentiment, sentiment_score = "negative", min(sentiment_score, -0.5)
    if emotion == "unknown" and sentiment == "negative":
        emotion, emotion_confidence = "frustrated", 0.5
    return CognitiveResult(
        intent=intent, intent_confidence=intent_confidence, sentiment=sentiment,
        sentiment_score=sentiment_score, emotion=emotion, emotion_confidence=emotion_confidence,
        response_guidance=response_guidance(intent, sentiment, emotion),
        classifier_version=version, inference_ms=round((perf_counter() - started) * 1000, 3),
    )


def as_payload(record: TurnIntelligence) -> dict[str, object]:
    try:
        acoustic = json.loads(record.acoustic_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        acoustic = {}
    return {
        "call_id": record.call_id, "call_turn_id": record.call_turn_id,
        "intent": record.intent, "intent_confidence": record.intent_confidence,
        "sentiment": record.sentiment, "sentiment_score": record.sentiment_score,
        "emotion": record.emotion, "emotion_confidence": record.emotion_confidence,
        "response_guidance": record.response_guidance,
        "classifier_version": record.classifier_version, "inference_ms": record.inference_ms,
        "fused_emotion": record.fused_emotion, "acoustic": acoustic,
    }


def persist_turn_intelligence(db: Session, call: Call, turn: CallTurn, acoustic: dict | None = None, *, commit: bool = True) -> tuple[TurnIntelligence, bool]:
    """Persist exactly one analysis for a customer turn; transcript storage wins on failure."""
    existing = db.query(TurnIntelligence).filter(TurnIntelligence.call_turn_id == turn.id).first()
    if existing:
        return existing, True
    result = detect_customer_text(turn.transcript)
    acoustic = acoustic if isinstance(acoustic, dict) and acoustic.get("available") else {}
    fused = result.emotion if result.emotion != "unknown" else ("aroused" if acoustic.get("cue") in {"elevated_energy", "rapid_speech"} else "unknown")
    record = TurnIntelligence(
        id=str(uuid4()), call_id=call.id, call_turn_id=turn.id,
        intent=result.intent, intent_confidence=result.intent_confidence,
        sentiment=result.sentiment, sentiment_score=result.sentiment_score,
        emotion=result.emotion, emotion_confidence=result.emotion_confidence,
        response_guidance=result.response_guidance, classifier_version=result.classifier_version,
        inference_ms=result.inference_ms, acoustic_json=json.dumps(acoustic), fused_emotion=fused,
    )
    db.add(record)
    if commit:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            stored = db.query(TurnIntelligence).filter(TurnIntelligence.call_turn_id == turn.id).first()
            if stored:
                return stored, True
            raise
    return record, False


def latest_turn_intelligence(db: Session, call_id: str) -> TurnIntelligence | None:
    return db.query(TurnIntelligence).filter(TurnIntelligence.call_id == call_id).order_by(TurnIntelligence.created_at.desc()).first()


def aggregate_call_experience(db: Session, call: Call) -> CallExperience:
    """Rebuild a call aggregate from immutable turn records; safe on retries."""
    rows = db.query(TurnIntelligence).filter(TurnIntelligence.call_id == call.id).order_by(TurnIntelligence.created_at).all()
    sentiments = [row.sentiment for row in rows]
    emotions = [row.emotion for row in rows if row.emotion != "unknown"]
    intents = [row.intent for row in rows if row.intent != "unknown"]
    positive, negative = sentiments.count("positive"), sentiments.count("negative")
    refusal = any(row.intent == "opt_out" for row in rows)
    sustained_negative = negative >= 2 and negative >= positive
    overall = "negative" if refusal or sustained_negative or negative > positive else "positive" if positive > negative else "neutral" if rows else "unknown"
    experience = "negative" if refusal or sustained_negative else "at_risk" if negative or any(row.emotion in {"frustrated", "angry"} for row in rows) else "positive" if positive else "neutral" if rows else "unknown"
    timeline = [{"call_turn_id": row.call_turn_id, "sentiment": row.sentiment, "score": row.sentiment_score, "emotion": row.emotion, "intent": row.intent} for row in rows]
    aggregate = db.get(CallExperience, call.id)
    if not aggregate:
        aggregate = CallExperience(call_id=call.id)
        db.add(aggregate)
    aggregate.customer_experience = experience
    aggregate.start_sentiment = sentiments[0] if sentiments else "unknown"
    aggregate.end_sentiment = sentiments[-1] if sentiments else "unknown"
    aggregate.overall_sentiment = overall
    aggregate.primary_intent = Counter(intents).most_common(1)[0][0] if intents else "unknown"
    aggregate.dominant_emotion = Counter(emotions).most_common(1)[0][0] if emotions else "unknown"
    aggregate.customer_turn_count = len(rows)
    aggregate.sentiment_timeline_json = json.dumps(timeline)
    try:
        analysis = json.loads(call.analysis_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        analysis = {}
    analysis["cognitive"] = {
        "customer_experience": aggregate.customer_experience,
        "start_sentiment": aggregate.start_sentiment,
        "end_sentiment": aggregate.end_sentiment,
        "overall_sentiment": aggregate.overall_sentiment,
        "primary_intent": aggregate.primary_intent,
        "dominant_emotion": aggregate.dominant_emotion,
        "customer_turn_count": aggregate.customer_turn_count,
    }
    call.analysis_json = json.dumps(analysis)
    db.commit()
    return aggregate
