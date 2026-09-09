import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class EligibilityCondition(BaseModel):
    field: str
    operator: str = Field(description="one of eq, neq, in, gte, lte, gt, lt, contains, between")
    value: object


class SchemeCreate(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    department: str
    description: str
    official_source_url: str


class SchemeUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    description: str | None = None
    official_source_url: str | None = None
    is_active: bool | None = None


class SchemeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    department: str
    description: str
    official_source_url: str
    is_active: bool
    created_at: datetime


class SchemeVersionCreate(BaseModel):
    eligibility_criteria: list[EligibilityCondition]
    benefits: str
    required_documents: list[str] = Field(default_factory=list)
    exclusions: list[str] = Field(default_factory=list)
    application_route: str
    verified_by: str
    verified_at: datetime


class SchemeVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    scheme_id: uuid.UUID
    version_number: int
    eligibility_criteria: list
    benefits: str
    required_documents: list
    exclusions: list
    application_route: str
    verified_by: str
    verified_at: datetime
    is_current: bool
