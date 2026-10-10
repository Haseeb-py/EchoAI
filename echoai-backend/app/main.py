from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.routes import auth, scripts, personas, campaigns, agent, users, operations, voice, preferences, system_settings, voice_sessions
from app.models import campaign, persona, script, user  # noqa: F401
from app.models import operations as operations_models  # noqa: F401
from app.models import preference as preference_model  # noqa: F401
from app.models import security as security_model  # noqa: F401
from app.models import system_setting as system_setting_model  # noqa: F401
from app.models import voice_session as voice_session_model  # noqa: F401
from app.models import voice_turn_receipt as voice_turn_receipt_model  # noqa: F401

Base.metadata.create_all(bind=engine)


def ensure_user_columns():
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.connect() as connection:
        result = connection.execute(text("PRAGMA table_info(users)"))
        columns = {row[1] for row in result}

        if "status" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(16) DEFAULT 'active'"))
            connection.execute(text("UPDATE users SET status = 'active' WHERE status IS NULL"))
            connection.commit()


def ensure_operational_columns():
    if not settings.database_url.startswith("sqlite"):
        return

    required_columns = {
        "campaigns": {
            "completed_at": "DATETIME",
            "archived_at": "DATETIME",
            "script_snapshot_json": "TEXT DEFAULT '{}'",
            "persona_snapshot_json": "TEXT DEFAULT '{}'",
            "call_direction": "VARCHAR(16) DEFAULT 'outbound'",
        },
        "calls": {
            "agent_id": "VARCHAR(36)",
            "outcome": "VARCHAR(80)",
            "summary": "TEXT DEFAULT ''",
            "analysis_json": "TEXT DEFAULT '{}'",
            "follow_up_recommendation": "TEXT DEFAULT ''",
        },
        "leads": {
            "assigned_agent_id": "VARCHAR(36)",
        },
        "escalation_alerts": {
            "acknowledged_at": "DATETIME",
            "resolved_at": "DATETIME",
            "resolution_note": "TEXT DEFAULT ''",
        },
        "call_states": {
            "is_muted": "BOOLEAN DEFAULT 0",
            "is_held": "BOOLEAN DEFAULT 0",
            "takeover_actor_id": "VARCHAR(36)",
        },
        "call_states": {
            "is_muted": "BOOLEAN DEFAULT 0",
            "is_held": "BOOLEAN DEFAULT 0",
            "takeover_actor_id": "VARCHAR(36)",
        },
    }
    with engine.connect() as connection:
        for table_name, columns_to_add in required_columns.items():
            existing = {row[1] for row in connection.execute(text(f"PRAGMA table_info({table_name})"))}
            for column_name, definition in columns_to_add.items():
                if column_name not in existing:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))
        duplicate_turn = connection.execute(text(
            "SELECT 1 FROM call_turns GROUP BY call_id, sequence HAVING COUNT(*) > 1 LIMIT 1"
        )).first()
        if not duplicate_turn:
            connection.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_call_turns_call_sequence ON call_turns (call_id, sequence)"
            ))
        connection.commit()


ensure_user_columns()
ensure_operational_columns()

app = FastAPI(title="EchoAI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(scripts.router, prefix="/api/admin", tags=["scripts"])
app.include_router(personas.router, prefix="/api/admin", tags=["personas"])
app.include_router(campaigns.router, prefix="/api/admin", tags=["campaigns"])
app.include_router(users.router, prefix="/api/admin", tags=["users"])
app.include_router(agent.router, prefix="/api", tags=["agent"])
app.include_router(operations.admin_router, prefix="/api/admin", tags=["operations-admin"])
app.include_router(operations.router, prefix="/api", tags=["operations"])
app.include_router(voice.router, prefix="/api", tags=["temporary-voice"])
app.include_router(voice_sessions.router, prefix="/api", tags=["voice-sessions"])
app.include_router(preferences.router, prefix="/api", tags=["supervisor-preferences"])
app.include_router(system_settings.router, prefix="/api", tags=["system-settings"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
