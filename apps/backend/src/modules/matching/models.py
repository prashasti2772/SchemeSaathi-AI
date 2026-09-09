import uuid
import enum
from sqlalchemy import Float, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
JSON_DATA = JSON().with_variant(JSONB(), "postgresql")
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class MatchStatus(str, enum.Enum):
    POTENTIAL = "potential"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class MatchResult(Base, TimestampMixin):
    __tablename__ = "match_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    scheme_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schemes.id", ondelete="CASCADE"), index=True)
    scheme_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scheme_versions.id", ondelete="CASCADE"))
    score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus, name="match_status"), default=MatchStatus.POTENTIAL)
    matched_conditions: Mapped[list] = mapped_column(JSON_DATA, default=list)
    unmatched_conditions: Mapped[list] = mapped_column(JSON_DATA, default=list)
    explanation: Mapped[str] = mapped_column(default="")
