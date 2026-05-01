import os
from dataclasses import dataclass


def _split_origins(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    access_token_expire_minutes: int
    cors_origins: list[str]


settings = Settings(
    database_url=os.getenv("DATABASE_URL", "sqlite:///./echoai.db"),
    secret_key=os.getenv("SECRET_KEY", "change-this-in-production"),
    access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480")),
    cors_origins=_split_origins(os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002")),
)
