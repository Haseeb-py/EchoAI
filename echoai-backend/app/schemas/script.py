from pydantic import BaseModel, Field


class ScriptCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    summary: str = Field(default="", max_length=400)
    content: str = ""
    is_active: bool = True


class ScriptUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    summary: str | None = Field(default=None, max_length=400)
    content: str | None = None
    is_active: bool | None = None


class ScriptOut(BaseModel):
    id: str
    title: str
    summary: str
    content: str
    is_active: bool

    class Config:
        from_attributes = True
