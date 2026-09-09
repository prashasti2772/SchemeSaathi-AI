import asyncio
from src.config.database import AsyncSessionLocal
from src.config.logging import get_logger
from src.jobs.celery_app import celery_app
from src.modules.documents.models import OcrStatus
from src.modules.documents.ocr_client import run_ocr

logger = get_logger("ocr_jobs")


@celery_app.task(name="documents.process_ocr", bind=True, max_retries=3, default_retry_delay=20)
def process_document_ocr(self, document_id: str) -> None:
    try:
        asyncio.run(_process_document_ocr(document_id))
    except Exception as exc:
        logger.error("ocr_processing_failed", document_id=document_id, error=str(exc))
        raise self.retry(exc=exc)


async def _process_document_ocr(document_id: str) -> None:
    from sqlalchemy import select
    from src.modules.documents.models import Document

    async with AsyncSessionLocal() as db:
        document = (await db.execute(select(Document).where(Document.id == document_id))).scalar_one_or_none()
        if not document:
            return
        document.ocr_status = OcrStatus.PROCESSING
        await db.commit()

        extracted_fields = await run_ocr(document.file_key, document.doc_type)
        document.ocr_extracted_fields = extracted_fields
        document.ocr_status = OcrStatus.COMPLETED if extracted_fields else OcrStatus.FAILED
        document.is_verified = False
        await db.commit()
