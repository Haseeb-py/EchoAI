from pydantic import BaseModel, Field


class PersonaCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    tone: str = Field(min_length=2, max_length=60)
    description: str = ""
    is_active: bool = True


class PersonaUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    tone: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = None
    is_active: bool | None = None


class PersonaOut(BaseModel):
    id: str
    name: str
    tone: str
    description: str
    is_active: bool

    class Config:
        from_attributes = True
