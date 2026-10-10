from datetime import datetime
from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.core.time import utcnow


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    product: Mapped[str] = mapped_column(String(200), default="")
    audience: Mapped[str] = mapped_column(String(200), default="")
    goal: Mapped[str] = mapped_column(String(300), default="")
    script_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    persona_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # Frozen at activation so completed campaigns retain their actual call configuration.
    script_snapshot_json: Mapped[str] = mapped_column(Text, default="{}")
    persona_snapshot_json: Mapped[str] = mapped_column(Text, default="{}")
    context: Mapped[str] = mapped_column(Text, default="")
    call_direction: Mapped[str] = mapped_column(String(16), default="outbound")
    status: Mapped[str] = mapped_column(String(24), default="draft")
    activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
