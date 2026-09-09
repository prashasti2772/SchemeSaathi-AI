import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.modules.notifications.models import NotificationChannel, NotificationStatus


class NotificationSendRequest(BaseModel):
    beneficiary_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    channel: NotificationChannel
    template: str
    context: dict = {}


class NotificationLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    channel: NotificationChannel
    template: str
    status: NotificationStatus
    provider_message_id: str | None
    created_at: datetime
