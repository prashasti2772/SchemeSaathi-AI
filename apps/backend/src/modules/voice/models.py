import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Enum, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
JSON_DATA = JSON().with_variant(JSONB(), "postgresql")
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class CallDirection(str, enum.Enum):
    INBOUND_MISSED_CALL = "inbound_missed_call"
    OUTBOUND_CALLBACK = "outbound_callback"


class CallStatus(str, enum.Enum):
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"


class CallSession(Base, TimestampMixin):
    __tablename__ = "call_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    beneficiary_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="SET NULL"), nullable=True)
    phone_number: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    direction: Mapped[CallDirection] = mapped_column(Enum(CallDirection, name="call_direction"), nullable=False)
    status: Mapped[CallStatus] = mapped_column(Enum(CallStatus, name="call_status"), default=CallStatus.RINGING)
    provider_call_sid: Mapped[str | None] = mapped_column(String(255), nullable=True)
    conversation_state: Mapped[dict] = mapped_column(JSON_DATA, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Speaker(str, enum.Enum):
    BENEFICIARY = "beneficiary"
    SYSTEM = "system"


class Transcript(Base, TimestampMixin):
    __tablename__ = "transcripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("call_sessions.id", ondelete="CASCADE"), index=True)
    speaker: Mapped[Speaker] = mapped_column(Enum(Speaker, name="speaker"), nullable=False)
    text: Mapped[str] = mapped_column(nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
