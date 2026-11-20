import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ReadinessCheckRequest(BaseModel):
    beneficiary_id: uuid.UUID
    scheme_id: uuid.UUID
    submitted_documents: list[str] = []


class ReadinessCheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    beneficiary_id: uuid.UUID
    scheme_id: uuid.UUID
    required_documents: list
    missing_documents: list
    is_ready: bool
    created_at: datetime
