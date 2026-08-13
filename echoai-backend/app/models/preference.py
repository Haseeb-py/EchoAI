from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.core.time import utcnow


class SupervisorPreference(Base):
    __tablename__ = "supervisor_preferences"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    refresh_seconds: Mapped[int] = mapped_column(Integer, default=15)
    alert_sounds_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    in_app_notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    default_landing_route: Mapped[str] = mapped_column(String(80), default="/supervisor")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
