import uuid
import enum
from sqlalchemy import String, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
JSON_DATA = JSON().with_variant(JSONB(), "postgresql")
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class JourneyState(str, enum.Enum):
    POTENTIAL = "potential"
    REACHED = "reached"
    PROFILED = "profiled"
    MATCHED = "matched"
    READY = "ready"
    APPLIED = "applied"
    OUTCOME_RECORDED = "outcome_recorded"


class Beneficiary(Base, TimestampMixin):
    __tablename__ = "beneficiaries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(10), default="hi")
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    business_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    income_band: Mapped[str | None] = mapped_column(String(100), nullable=True)
    social_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    profile_attributes: Mapped[dict] = mapped_column(JSON_DATA, default=dict)
    journey_state: Mapped[JourneyState] = mapped_column(Enum(JourneyState, name="journey_state"), default=JourneyState.POTENTIAL)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ConsentType(str, enum.Enum):
    OUTREACH_CONTACT = "outreach_contact"
    PROFILE_COLLECTION = "profile_collection"
    DATA_SHARING_WITH_FACILITATOR = "data_sharing_with_facilitator"


class ConsentRecord(Base, TimestampMixin):
    __tablename__ = "consent_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    consent_type: Mapped[ConsentType] = mapped_column(Enum(ConsentType, name="consent_type"), nullable=False)
    granted: Mapped[bool] = mapped_column(Boolean, default=False)
    granted_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_channel: Mapped[str] = mapped_column(String(50), default="voice")
