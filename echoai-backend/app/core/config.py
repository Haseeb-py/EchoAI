import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _split_origins(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    access_token_expire_minutes: int
    cors_origins: list[str]
    deepgram_api_key: str
    groq_api_key: str
    groq_model: str
    livekit_url: str
    livekit_api_key: str
    livekit_api_secret: str
    voice_worker_url: str
    voice_worker_secret: str


settings = Settings(
    database_url=os.getenv("DATABASE_URL", "sqlite:///./echoai.db"),
    secret_key=os.getenv("SECRET_KEY", "change-this-in-production"),
    access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480")),
    cors_origins=_split_origins(os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002")),
    deepgram_api_key=os.getenv("DEEPGRAM_API_KEY", ""),
    groq_api_key=os.getenv("GROQ_API_KEY", ""),
    groq_model=os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
    livekit_url=os.getenv("LIVEKIT_URL", ""),
    livekit_api_key=os.getenv("LIVEKIT_API_KEY", ""),
    livekit_api_secret=os.getenv("LIVEKIT_API_SECRET", ""),
    voice_worker_url=os.getenv("VOICE_WORKER_URL", "").rstrip("/"),
    voice_worker_secret=os.getenv("ECHOAI_INTERNAL_VOICE_SECRET", ""),
)
