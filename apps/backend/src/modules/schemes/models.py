import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
JSON_DATA = JSON().with_variant(JSONB(), "postgresql")
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin


class Scheme(Base, TimestampMixin):
    __tablename__ = "schemes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    official_source_url: Mapped[str] = mapped_column(String(512), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class SchemeVersion(Base, TimestampMixin):
    __tablename__ = "scheme_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schemes.id", ondelete="CASCADE"), index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    eligibility_criteria: Mapped[dict] = mapped_column(JSON_DATA, nullable=False)
    benefits: Mapped[str] = mapped_column(Text, nullable=False)
    required_documents: Mapped[list] = mapped_column(JSON_DATA, default=list)
    exclusions: Mapped[list] = mapped_column(JSON_DATA, default=list)
    application_route: Mapped[str] = mapped_column(Text, nullable=False)
    verified_by: Mapped[str] = mapped_column(String(255), nullable=False)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
