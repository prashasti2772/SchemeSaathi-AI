import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.modules.documents.models import OcrStatus


class DocumentUploadRequest(BaseModel):
    beneficiary_id: uuid.UUID
    application_journey_id: uuid.UUID | None = None
    doc_type: str
    file_key: str


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    beneficiary_id: uuid.UUID
    doc_type: str
    file_key: str
    ocr_status: OcrStatus
    ocr_extracted_fields: dict
    is_verified: bool
    created_at: datetime


class DocumentVerifyRequest(BaseModel):
    is_verified: bool


class PresignedUploadRequest(BaseModel):
    beneficiary_id: uuid.UUID
    doc_type: str
    content_type: str = "image/jpeg"


class PresignedUploadResponse(BaseModel):
    upload_url: str
    file_key: str
    expires_in: int
