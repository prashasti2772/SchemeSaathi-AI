import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class JourneyStage(str, enum.Enum):
    POTENTIAL = "potential"
    REACHED = "reached"
    PROFILED = "profiled"
    MATCHED = "matched"
    READY = "ready"
    APPLIED = "applied"
    OUTCOME_PENDING = "outcome_pending"
    OUTCOME_RECORDED = "outcome_recorded"


class ApplicationJourney(Base, TimestampMixin):
    __tablename__ = "application_journeys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    scheme_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schemes.id", ondelete="CASCADE"), index=True)
    stage: Mapped[JourneyStage] = mapped_column(Enum(JourneyStage, name="journey_stage"), default=JourneyStage.POTENTIAL)
    notes: Mapped[str | None] = mapped_column(String(1024), nullable=True)


class StatusEvent(Base, TimestampMixin):
    __tablename__ = "status_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journey_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("application_journeys.id", ondelete="CASCADE"), index=True)
    stage: Mapped[JourneyStage] = mapped_column(Enum(JourneyStage, name="journey_stage_event"), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actor: Mapped[str] = mapped_column(String(255), nullable=False)
