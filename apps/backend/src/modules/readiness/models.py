import uuid
from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
JSON_DATA = JSON().with_variant(JSONB(), "postgresql")
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class ReadinessCheck(Base, TimestampMixin):
    __tablename__ = "readiness_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    scheme_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schemes.id", ondelete="CASCADE"), index=True)
    required_documents: Mapped[list] = mapped_column(JSON_DATA, default=list)
    missing_documents: Mapped[list] = mapped_column(JSON_DATA, default=list)
    is_ready: Mapped[bool] = mapped_column(Boolean, default=False)
