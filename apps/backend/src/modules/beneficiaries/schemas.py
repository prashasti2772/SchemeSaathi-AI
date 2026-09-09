import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from src.modules.beneficiaries.models import ConsentType, JourneyState


class BeneficiaryCreate(BaseModel):
    phone_number: str = Field(min_length=8, max_length=20)
    full_name: str | None = None
    preferred_language: str = "hi"
    location: str | None = None
    occupation: str | None = None
    business_type: str | None = None
    income_band: str | None = None
    social_category: str | None = None
    profile_attributes: dict = Field(default_factory=dict)


class BeneficiaryUpdate(BaseModel):
    full_name: str | None = None
    location: str | None = None
    occupation: str | None = None
    business_type: str | None = None
    income_band: str | None = None
    social_category: str | None = None
    profile_attributes: dict | None = None
    journey_state: JourneyState | None = None


class BeneficiaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str | None
    phone_number: str
    preferred_language: str
    location: str | None
    occupation: str | None
    business_type: str | None
    income_band: str | None
    social_category: str | None
    profile_attributes: dict
    journey_state: JourneyState
    is_active: bool
    created_at: datetime


class ConsentGrantRequest(BaseModel):
    consent_type: ConsentType
    granted: bool
    source_channel: str = "voice"


class ConsentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    consent_type: ConsentType
    granted: bool
    source_channel: str
    created_at: datetime


class BulkImportRowError(BaseModel):
    row_number: int
    phone_number: str | None = None
    error: str


class BulkImportResponse(BaseModel):
    total_rows: int
    created_count: int
    skipped_count: int
    errors: list[BulkImportRowError]
