import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class Facilitator(Base, TimestampMixin):
    __tablename__ = "facilitators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    region: Mapped[str] = mapped_column(String(255), nullable=False)
    organization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AssistedCaseStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


class AssistedCase(Base, TimestampMixin):
    __tablename__ = "assisted_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facilitator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("facilitators.id", ondelete="CASCADE"), index=True)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    status: Mapped[AssistedCaseStatus] = mapped_column(Enum(AssistedCaseStatus, name="assisted_case_status"), default=AssistedCaseStatus.OPEN)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
