from datetime import datetime

from typing import Literal

from pydantic import BaseModel, Field


class ScriptNode(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    type: str = Field(pattern="^(opening|discovery|pitch|objection|closing)$")
    goal: str = Field(min_length=1, max_length=500)
    prompt: str = Field(min_length=1)
    next_node_ids: list[str] = []


class ObjectionCreate(BaseModel):
    node_id: str | None = None
    category: str = Field(min_length=2, max_length=80)
    trigger_terms: list[str] = []
    approved_response: str = Field(min_length=2)


class ObjectionUpdate(BaseModel):
    node_id: str | None = None
    category: str | None = Field(default=None, min_length=2, max_length=80)
    trigger_terms: list[str] | None = None
    approved_response: str | None = Field(default=None, min_length=2)


class CallCreate(BaseModel):
    campaign_id: str
    lead_id: str | None = None


class TurnCreate(BaseModel):
    campaign_id: str
    sequence: int = Field(ge=0)
    speaker: str = Field(pattern="^(customer|ai|supervisor|system)$")
    transcript: str = Field(min_length=1, max_length=10000)
    occurred_at: datetime | None = None
    is_final: bool = True


class TurnResponse(BaseModel):
    call_id: str
    next_sequence: int
    current_node_id: str | None
    next_node_id: str | None
    approved_objection_response: str | None
    suggested_reply: str | None
    escalation: dict | None
    retrieval_context: list[dict] = []
    cognitive: dict | None = None
    llm_prompt: str


class KnowledgeCreate(BaseModel):
    campaign_id: str | None = None
    title: str = Field(min_length=2, max_length=200)
    category: str = Field(default="faq", min_length=2, max_length=80)
    content: str = Field(min_length=2, max_length=10000)
    status: Literal["draft", "published", "needs_review"] = "draft"


class KnowledgeUpdate(BaseModel):
    campaign_id: str | None = None
    title: str | None = Field(default=None, min_length=2, max_length=200)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    content: str | None = Field(default=None, min_length=2, max_length=10000)
    status: Literal["draft", "published", "needs_review"] | None = None


class CallComplete(BaseModel):
    outcome: str = Field(min_length=2, max_length=80)
    summary: str = Field(default="", max_length=10000)
    analysis: dict | None = None
    follow_up_recommendation: str = Field(default="", max_length=5000)


class CallAnalysisPrompt(BaseModel):
    call_id: str
    transcript: list[dict]
    prompt: str


class EscalationAction(BaseModel):
    note: str = Field(default="", max_length=2000)


class CallControl(BaseModel):
    action: Literal["mute", "unmute", "hold", "resume"]


class SupervisorWhisperCreate(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class CallControl(BaseModel):
    action: Literal["mute", "unmute", "hold", "resume"]


class SupervisorWhisperCreate(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class VoiceTextTurn(BaseModel):
    campaign_id: str
    sequence: int = Field(ge=0)
    transcript: str = Field(min_length=1, max_length=10000)


class LeadCreate(BaseModel):
    campaign_id: str
    assigned_agent_id: str | None = None
    name: str = Field(min_length=2, max_length=200)
    contact: str = Field(default="", max_length=200)
    score: int = Field(default=0, ge=0, le=100)
    status: str = Field(default="new", max_length=24)


class LeadUpdate(BaseModel):
    assigned_agent_id: str | None = None
    name: str | None = Field(default=None, min_length=2, max_length=200)
    contact: str | None = Field(default=None, max_length=200)
    score: int | None = Field(default=None, ge=0, le=100)
    status: str | None = Field(default=None, max_length=24)
    summary: str | None = Field(default=None, max_length=10000)
