import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.integrations.storage_client import get_presigned_upload_url
from src.middlewares.error_handler import NotFoundException
from src.modules.documents.models import Document, OcrStatus
from src.modules.documents.schemas import DocumentUploadRequest, PresignedUploadRequest, PresignedUploadResponse

UPLOAD_URL_EXPIRY_SECONDS = 300


def create_presigned_upload(payload: PresignedUploadRequest) -> PresignedUploadResponse:
    file_extension = payload.content_type.split("/")[-1]
    file_key = f"documents/{payload.beneficiary_id}/{payload.doc_type}-{uuid.uuid4().hex}.{file_extension}"
    upload_url = get_presigned_upload_url(file_key, payload.content_type, UPLOAD_URL_EXPIRY_SECONDS)
    return PresignedUploadResponse(upload_url=upload_url, file_key=file_key, expires_in=UPLOAD_URL_EXPIRY_SECONDS)


async def register_uploaded_document(db: AsyncSession, payload: DocumentUploadRequest) -> Document:
    document = Document(**payload.model_dump())
    db.add(document)
    await db.commit()
    await db.refresh(document)

    from src.jobs.ocr_jobs import process_document_ocr

    process_document_ocr.delay(str(document.id))
    return document


async def get_document(db: AsyncSession, document_id: str) -> Document:
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise NotFoundException("Document not found")
    return document


async def apply_ocr_result(db: AsyncSession, document_id: str, extracted_fields: dict, status: OcrStatus) -> Document:
    document = await get_document(db, document_id)
    document.ocr_extracted_fields = extracted_fields
    document.ocr_status = status
    document.is_verified = False
    await db.commit()
    await db.refresh(document)
    return document


async def verify_document(db: AsyncSession, document_id: str, is_verified: bool) -> Document:
    document = await get_document(db, document_id)
    document.is_verified = is_verified
    await db.commit()
    await db.refresh(document)
    return document


async def retry_ocr(db: AsyncSession, document_id: str) -> Document:
    document = await get_document(db, document_id)
    document.ocr_status = OcrStatus.PENDING
    await db.commit()
    await db.refresh(document)

    from src.jobs.ocr_jobs import process_document_ocr

    process_document_ocr.delay(str(document.id))
    return document


async def list_documents_for_beneficiary(db: AsyncSession, beneficiary_id: str) -> list[Document]:
    result = await db.execute(select(Document).where(Document.beneficiary_id == beneficiary_id))
    return list(result.scalars().all())
