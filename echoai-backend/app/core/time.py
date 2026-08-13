from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return a naive UTC timestamp for existing SQLAlchemy DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
