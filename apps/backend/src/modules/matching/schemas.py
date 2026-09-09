import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.modules.matching.models import MatchStatus


class MatchResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    beneficiary_id: uuid.UUID
    scheme_id: uuid.UUID
    scheme_version_id: uuid.UUID
    score: float
    status: MatchStatus
    matched_conditions: list
    unmatched_conditions: list
    explanation: str
    created_at: datetime


class RunMatchingRequest(BaseModel):
    beneficiary_id: uuid.UUID


class MatchStatusUpdate(BaseModel):
    status: MatchStatus
