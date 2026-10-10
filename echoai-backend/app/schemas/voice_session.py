from pydantic import BaseModel


class VoiceSessionCreate(BaseModel):
    call_id: str


class VoiceSessionOut(BaseModel):
    id: str
    call_id: str
    room_name: str
    participant_identity: str
    status: str
    livekit_url: str
    participant_token: str


class VoiceSessionStatusOut(BaseModel):
    id: str
    call_id: str
    room_name: str
    status: str
