from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.preference import SupervisorPreference
from app.schemas.preference import SupervisorPreferenceUpdate

router = APIRouter(prefix="/supervisor/preferences")


def _require_supervisor(user):
    if user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")


def _serialize(preference: SupervisorPreference):
    return {
        "refresh_seconds": preference.refresh_seconds,
        "alert_sounds_enabled": preference.alert_sounds_enabled,
        "in_app_notifications_enabled": preference.in_app_notifications_enabled,
        "default_landing_route": preference.default_landing_route,
        "updated_at": preference.updated_at,
    }


@router.get("")
def get_preferences(db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_supervisor(user)
    preference = db.query(SupervisorPreference).filter(SupervisorPreference.user_id == user.id).first()
    if not preference:
        preference = SupervisorPreference(user_id=user.id)
        db.add(preference)
        db.commit()
        db.refresh(preference)
    return _serialize(preference)


@router.put("")
def update_preferences(payload: SupervisorPreferenceUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _require_supervisor(user)
    preference = db.query(SupervisorPreference).filter(SupervisorPreference.user_id == user.id).first()
    if not preference:
        preference = SupervisorPreference(user_id=user.id)
        db.add(preference)
    for field, value in payload.model_dump().items():
        setattr(preference, field, value)
    db.commit()
    db.refresh(preference)
    return _serialize(preference)
