from typing import Literal

from pydantic import BaseModel, Field


class SystemSettingUpdate(BaseModel):
    workspace_name: str = Field(min_length=2, max_length=160)
    max_concurrent_calls: int = Field(ge=1, le=10000)
    default_language: Literal["English", "Urdu", "Arabic"]
    environment_mode: Literal["Demo", "Staging", "Production"]
