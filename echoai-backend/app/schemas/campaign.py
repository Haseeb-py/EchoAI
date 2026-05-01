from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    product: str = ""
    audience: str = ""
    goal: str = ""
    script_id: str | None = None
    persona_id: str | None = None
    context: str = ""
    status: str = "draft"


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    product: str | None = None
    audience: str | None = None
    goal: str | None = None
    script_id: str | None = None
    persona_id: str | None = None
    context: str | None = None
    status: str | None = None


class CampaignOut(BaseModel):
    id: str
    name: str
    product: str
    audience: str
    goal: str
    script_id: str | None
    persona_id: str | None
    context: str
    status: str

    class Config:
        from_attributes = True
