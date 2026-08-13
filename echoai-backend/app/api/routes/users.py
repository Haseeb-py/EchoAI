from secrets import token_urlsafe
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.core.security import hash_password
from app.models.user import User
from app.models.security import SecurityEvent
from app.schemas.user import PasswordResetResponse, UserAdminCreate, UserAdminUpdate, UserOut
from app.services.security_audit import record_security_event

router = APIRouter(prefix="/users")


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.get("/events")
def list_security_events(db: Session = Depends(get_db), _user=Depends(require_admin)):
    events = db.query(SecurityEvent).order_by(SecurityEvent.created_at.desc()).limit(100).all()
    return [{
        "id": event.id, "user_email": event.user_email, "event": event.event,
        "severity": event.severity, "context": event.context, "created_at": event.created_at,
    } for event in events]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserAdminCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        id=str(uuid4()),
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        status=payload.status,
    )
    db.add(user)
    record_security_event(
        db, actor_id=_user.id, user_email=user.email, event="Account created",
        context=f"Administrator created a {user.role} account with {user.status} status.",
    )
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserAdminUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    removes_active_admin = (
        user.role == "admin"
        and user.status == "active"
        and ((payload.role is not None and payload.role != "admin") or (payload.status is not None and payload.status != "active"))
    )
    if removes_active_admin and db.query(User).filter(User.role == "admin", User.status == "active").count() <= 1:
        raise HTTPException(status_code=409, detail="At least one active administrator must remain")

    previous_status = user.status
    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email
    if payload.role is not None:
        user.role = payload.role
    if payload.status is not None:
        user.status = payload.status
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)

    event = "Account status changed" if payload.status is not None and payload.status != previous_status else "Account updated"
    severity = "warning" if payload.status in {"inactive", "locked"} else "info"
    record_security_event(
        db, actor_id=_user.id, user_email=user.email, event=event, severity=severity,
        context=f"Administrator updated account settings. Current status: {user.status}.",
    )

    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", response_model=PasswordResetResponse)
def reset_password(user_id: str, db: Session = Depends(get_db), _user=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    temp_password = f"Temp-{token_urlsafe(6)}"
    user.hashed_password = hash_password(temp_password)
    record_security_event(
        db, actor_id=_user.id, user_email=user.email, event="Password reset issued",
        context="Administrator issued a temporary password. The password value is not retained in audit history.",
    )
    db.commit()
    return PasswordResetResponse(temporary_password=temp_password)
