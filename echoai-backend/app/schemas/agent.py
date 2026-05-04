from pydantic import BaseModel

from app.schemas.persona import PersonaOut
from app.schemas.script import ScriptOut


class AgentCampaignOut(BaseModel):
    id: str
    name: str
    product: str
    audience: str
    goal: str
    status: str
    script: ScriptOut | None
    persona: PersonaOut | None

    class Config:
        from_attributes = True
