import uuid
from pydantic import BaseModel, ConfigDict
from src.modules.facilitators.models import AssistedCaseStatus


class FacilitatorCreate(BaseModel):
    user_id: uuid.UUID
    region: str
    organization: str | None = None


class FacilitatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    region: str
    organization: str | None
    is_active: bool


class AssistedCaseCreate(BaseModel):
    beneficiary_id: uuid.UUID


class AssistedCaseUpdate(BaseModel):
    status: AssistedCaseStatus


class AssistedCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    facilitator_id: uuid.UUID
    beneficiary_id: uuid.UUID
    status: AssistedCaseStatus
