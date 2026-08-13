from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.services.security_audit import record_security_event
from app.schemas.auth import LoginPayload, SignupPayload, TokenResponse
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth")


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupPayload, db: Session = Depends(get_db)):
    # Only the initial organization owner is public. Staff accounts use admin-only user management.
    if db.query(User).filter(User.role == "admin").first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization owner already exists. Ask an administrator to create your account.")
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        id=str(uuid4()),
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    record_security_event(
        db, actor_id=user.id, user_email=user.email, event="Login successful",
        context="Account access approved with an active account state.",
    )
    db.commit()
    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(access_token=token, user=user)
