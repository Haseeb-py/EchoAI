from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.security import SecurityEvent


def record_security_event(
    db: Session, *, user_email: str, event: str, severity: str = "info", context: str = "", actor_id: str | None = None,
) -> None:
    """Record operational security facts only; credentials and tokens never enter the audit log."""
    db.add(SecurityEvent(
        id=str(uuid4()), actor_id=actor_id, user_email=user_email,
        event=event, severity=severity, context=context,
    ))
