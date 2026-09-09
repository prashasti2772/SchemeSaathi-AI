import uuid
import enum
from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class NotificationChannel(str, enum.Enum):
    SMS = "sms"
    VOICE = "voice"
    EMAIL = "email"


class NotificationStatus(str, enum.Enum):
    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"


class NotificationLog(Base, TimestampMixin):
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    beneficiary_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel, name="notification_channel"), nullable=False)
    template: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(Enum(NotificationStatus, name="notification_status"), default=NotificationStatus.QUEUED)
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
