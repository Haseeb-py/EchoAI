from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base


class VoiceSession(Base):
    """Call-scoped LiveKit session metadata; provider secrets are never stored."""

    __tablename__ = "voice_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    call_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    room_name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    participant_identity: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(24), default="ready")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
