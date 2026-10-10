from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class VoiceTurnReceipt(Base):
    __tablename__ = "voice_turn_receipts"
    __table_args__ = (UniqueConstraint("call_id", "speaker", "worker_turn_id", name="uq_voice_turn_receipt"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    call_id: Mapped[str] = mapped_column(String(36), index=True)
    speaker: Mapped[str] = mapped_column(String(24))
    worker_turn_id: Mapped[str] = mapped_column(String(80))
    call_turn_id: Mapped[str] = mapped_column(String(36))
