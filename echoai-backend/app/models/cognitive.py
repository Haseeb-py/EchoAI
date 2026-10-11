from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base


class TurnIntelligence(Base):
    """Immutable cognitive result for one persisted customer transcript turn."""

    __tablename__ = "turn_intelligence"
    __table_args__ = (UniqueConstraint("call_turn_id", name="uq_turn_intelligence_call_turn"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    call_id: Mapped[str] = mapped_column(String(36), index=True)
    call_turn_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    intent: Mapped[str] = mapped_column(String(80), default="unknown")
    intent_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    sentiment: Mapped[str] = mapped_column(String(24), default="neutral")
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    emotion: Mapped[str] = mapped_column(String(32), default="unknown")
    emotion_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    response_guidance: Mapped[str] = mapped_column(Text, default="")
    classifier_version: Mapped[str] = mapped_column(String(80), default="rule-baseline-v1")
    inference_ms: Mapped[float] = mapped_column(Float, default=0.0)
    acoustic_json: Mapped[str] = mapped_column(Text, default="{}")
    fused_emotion: Mapped[str] = mapped_column(String(32), default="unknown")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CallExperience(Base):
    """Idempotent aggregate of the persisted customer-turn intelligence."""

    __tablename__ = "call_experiences"

    call_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_experience: Mapped[str] = mapped_column(String(32), default="unknown")
    start_sentiment: Mapped[str] = mapped_column(String(24), default="unknown")
    end_sentiment: Mapped[str] = mapped_column(String(24), default="unknown")
    overall_sentiment: Mapped[str] = mapped_column(String(24), default="unknown")
    primary_intent: Mapped[str] = mapped_column(String(80), default="unknown")
    dominant_emotion: Mapped[str] = mapped_column(String(32), default="unknown")
    customer_turn_count: Mapped[int] = mapped_column(Integer, default=0)
    sentiment_timeline_json: Mapped[str] = mapped_column(Text, default="[]")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
