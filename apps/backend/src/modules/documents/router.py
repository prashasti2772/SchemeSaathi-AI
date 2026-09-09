from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rbac_middleware import require_any_staff, require_operator
from src.modules.documents import service
from src.modules.documents.schemas import DocumentOut, DocumentUploadRequest, DocumentVerifyRequest, PresignedUploadRequest, PresignedUploadResponse

router = APIRouter(prefix="/documents", tags=["Documents"], dependencies=[Depends(require_any_staff)])


@router.post("/presigned-upload-url", response_model=PresignedUploadResponse)
async def create_presigned_upload_url(payload: PresignedUploadRequest):
    return service.create_presigned_upload(payload)


@router.post("", response_model=DocumentOut, status_code=201)
async def register_uploaded_document(payload: DocumentUploadRequest, db: AsyncSession = Depends(get_db)):
    return await service.register_uploaded_document(db, payload)


@router.post("/{document_id}/retry-ocr", response_model=DocumentOut, dependencies=[Depends(require_operator)])
async def retry_ocr(document_id: str, db: AsyncSession = Depends(get_db)):
    return await service.retry_ocr(db, document_id)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_document(db, document_id)


@router.patch("/{document_id}/verify", response_model=DocumentOut, dependencies=[Depends(require_operator)])
async def verify_document(document_id: str, payload: DocumentVerifyRequest, db: AsyncSession = Depends(get_db)):
    return await service.verify_document(db, document_id, payload.is_verified)


@router.get("/beneficiary/{beneficiary_id}", response_model=list[DocumentOut])
async def list_documents_for_beneficiary(beneficiary_id: str, db: AsyncSession = Depends(get_db)):
    return await service.list_documents_for_beneficiary(db, beneficiary_id)
