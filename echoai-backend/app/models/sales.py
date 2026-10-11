"""Persistent, campaign-independent Module 5 sales intelligence."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base


class TurnSalesIntelligence(Base):
    """One immutable sales decision for one persisted customer turn."""

    __tablename__ = "turn_sales_intelligence"
    __table_args__ = (UniqueConstraint("call_turn_id", name="uq_turn_sales_intelligence_call_turn"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    call_id: Mapped[str] = mapped_column(String(36), index=True)
    call_turn_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    objection_type: Mapped[str] = mapped_column(String(48), default="none")
    objection_types_json: Mapped[str] = mapped_column(Text, default="[]")
    objection_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    buying_signal: Mapped[str] = mapped_column(String(48), default="none")
    buying_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    commitment_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    recommended_strategy: Mapped[str] = mapped_column(Text, default="")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    upsell_json: Mapped[str] = mapped_column(Text, default="[]")
    classifier_version: Mapped[str] = mapped_column(String(80), default="sales-rule-baseline-v1")
    inference_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CallSalesSummary(Base):
    """Idempotent call-level rollup of customer sales signals."""

    __tablename__ = "call_sales_summaries"

    call_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    objection_count: Mapped[int] = mapped_column(Integer, default=0)
    primary_objection: Mapped[str] = mapped_column(String(48), default="none")
    buying_signal_count: Mapped[int] = mapped_column(Integer, default=0)
    highest_buying_signal: Mapped[str] = mapped_column(String(48), default="none")
    commitment_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
