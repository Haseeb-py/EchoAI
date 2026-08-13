from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.core.time import utcnow


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_name: Mapped[str] = mapped_column(String(160), default="EchoAI Admin Workspace")
    max_concurrent_calls: Mapped[int] = mapped_column(Integer, default=100)
    default_language: Mapped[str] = mapped_column(String(40), default="English")
    environment_mode: Mapped[str] = mapped_column(String(24), default="Demo")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
