from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.routes import auth, scripts, personas, campaigns, agent, users
from app.models import campaign, persona, script, user  # noqa: F401

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


ensure_user_columns()

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


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
