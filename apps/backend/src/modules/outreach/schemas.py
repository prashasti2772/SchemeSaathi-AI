import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.modules.outreach.models import CampaignStatus, DeliveryStatus


class CampaignCreate(BaseModel):
    name: str
    scheme_id: uuid.UUID | None = None
    message_template: str


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    scheme_id: uuid.UUID | None
    message_template: str
    status: CampaignStatus
    created_by: uuid.UUID
    created_at: datetime


class AudienceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    beneficiary_id: uuid.UUID
    selected_reason: str


class DeliveryEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    beneficiary_id: uuid.UUID
    channel: str
    status: DeliveryStatus
    provider_message_id: str | None
