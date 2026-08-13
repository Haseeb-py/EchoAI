from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.core.config import settings
from app.models.system_setting import SystemSetting
from app.schemas.system_setting import SystemSettingUpdate
from app.services.security_audit import record_security_event

router = APIRouter(prefix="/admin/settings")
SETTING_ID = "workspace"


def get_system_setting(db: Session) -> SystemSetting:
    setting = db.query(SystemSetting).filter(SystemSetting.id == SETTING_ID).first()
    if not setting:
        setting = SystemSetting(id=SETTING_ID)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


def _serialize(setting: SystemSetting) -> dict:
    return {
        "workspace_name": setting.workspace_name,
        "max_concurrent_calls": setting.max_concurrent_calls,
        "default_language": setting.default_language,
        "environment_mode": setting.environment_mode,
        "updated_at": setting.updated_at,
        "integrations": [
            {"id": "backend", "name": "FastAPI Backend", "purpose": "Core API layer", "status": "configured"},
            {"id": "deepgram", "name": "Deepgram STT/TTS", "purpose": "Temporary voice adapter", "status": "configured" if settings.deepgram_api_key else "not_configured"},
            {"id": "groq", "name": "Groq LLM", "purpose": "Live reply and post-call analysis", "status": "configured" if settings.groq_api_key else "not_configured"},
            {"id": "voice_pipeline", "name": "Production 3A Voice Pipeline", "purpose": "Teammate integration dependency", "status": "pending"},
        ],
    }


@router.get("")
def read_system_settings(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return _serialize(get_system_setting(db))


@router.put("")
def update_system_settings(payload: SystemSettingUpdate, db: Session = Depends(get_db), user=Depends(require_admin)):
    setting = get_system_setting(db)
    for field, value in payload.model_dump().items():
        setattr(setting, field, value)
    record_security_event(
        db, actor_id=user.id, user_email=user.email, event="System settings updated",
        context="Administrator updated persisted workspace defaults. Provider credentials remain environment-only.",
    )
    db.commit()
    db.refresh(setting)
    return _serialize(setting)
