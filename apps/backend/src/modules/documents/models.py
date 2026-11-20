import uuid
import enum
from sqlalchemy import String, Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
JSON_DATA = JSON().with_variant(JSONB(), "postgresql")
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class OcrStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    application_journey_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("application_journeys.id", ondelete="SET NULL"), nullable=True)
    file_key: Mapped[str] = mapped_column(String(512), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(100), nullable=False)
    ocr_status: Mapped[OcrStatus] = mapped_column(Enum(OcrStatus, name="ocr_status"), default=OcrStatus.PENDING)
    ocr_extracted_fields: Mapped[dict] = mapped_column(JSON_DATA, default=dict)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
