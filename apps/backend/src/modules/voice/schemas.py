import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.modules.voice.models import CallDirection, CallStatus, Speaker


class MissedCallWebhook(BaseModel):
    phone_number: str
    provider_call_sid: str


class AudioTurnRequest(BaseModel):
    audio_base64: str
    language: str = "hi"


class AudioTurnResult(BaseModel):
    beneficiary_transcript: str
    prompt_text: str
    prompt_audio_base64: str
    conversation_complete: bool


class CallSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    beneficiary_id: uuid.UUID | None
    phone_number: str
    direction: CallDirection
    status: CallStatus
    conversation_state: dict
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime


class TranscriptTurnCreate(BaseModel):
    speaker: Speaker
    text: str
    confidence: float | None = None


class TranscriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    speaker: Speaker
    text: str
    confidence: float | None
    created_at: datetime
