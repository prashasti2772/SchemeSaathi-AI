import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.modules.applications.models import JourneyStage


class JourneyCreate(BaseModel):
    beneficiary_id: uuid.UUID
    scheme_id: uuid.UUID


class JourneyStageUpdate(BaseModel):
    stage: JourneyStage
    notes: str | None = None


class JourneyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    beneficiary_id: uuid.UUID
    scheme_id: uuid.UUID
    stage: JourneyStage
    notes: str | None
    created_at: datetime
    updated_at: datetime


class StatusEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    stage: JourneyStage
    occurred_at: datetime
    actor: str
