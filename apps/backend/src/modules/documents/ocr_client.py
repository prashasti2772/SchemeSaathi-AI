import base64
import httpx
from src.config.settings import settings
from src.config.logging import get_logger
from src.integrations.storage_client import get_presigned_download_url

logger = get_logger("ocr_client")


async def run_ocr(file_key: str, doc_type: str) -> dict:
    """Runs OCR on a stored document. Result is always returned as
    unverified extracted fields — a human must confirm before use,
    per the architecture's trust rules."""
    if settings.OCR_PROVIDER == "google_vision":
        return await _run_google_vision(file_key, doc_type)
    logger.error("unknown_ocr_provider", provider=settings.OCR_PROVIDER)
    return {"fields": {}, "verified": False}


async def _run_google_vision(file_key: str, doc_type: str) -> dict:
    if not settings.GOOGLE_VISION_API_KEY:
        logger.warning("google_vision_not_configured")
        return {"fields": {}, "verified": False}
    download_url = get_presigned_download_url(file_key)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            file_response = await client.get(download_url)
            file_response.raise_for_status()
            image_base64 = base64.b64encode(file_response.content).decode()

            vision_response = await client.post(
                f"https://vision.googleapis.com/v1/images:annotate?key={settings.GOOGLE_VISION_API_KEY}",
                json={"requests": [{"image": {"content": image_base64}, "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]}]},
            )
            vision_response.raise_for_status()
            data = vision_response.json()

        raw_text = data["responses"][0].get("fullTextAnnotation", {}).get("text", "")
        return {"fields": {"raw_text": raw_text, "doc_type": doc_type}, "verified": False}
    except (httpx.HTTPError, KeyError, IndexError) as exc:
        logger.error("google_vision_ocr_failed", file_key=file_key, error=str(exc))
        return {"fields": {}, "verified": False}
