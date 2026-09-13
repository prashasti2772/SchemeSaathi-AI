import asyncio
import base64
import io
import json
import re
import zipfile
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.config.settings import settings
from src.modules.chatbot.schemas import AssistantChatRequest
from src.modules.chatbot.service import chatbot_service
from src.modules.eligibility import localization
from src.modules.eligibility.service import eligibility_service
from src.middlewares.rate_limiter import limiter

router = APIRouter(prefix="/public", tags=["Public"])


def _parse_history(raw_history: str | None) -> list[dict[str, Any]]:
    if not raw_history:
        return []
    try:
        history = json.loads(raw_history)
    except (TypeError, ValueError):
        return []
    if not isinstance(history, list):
        return []
    clean_history = []
    for item in history:
        if isinstance(item, dict) and isinstance(item.get("role"), str) and isinstance(item.get("content"), str):
            clean_history.append({"role": item["role"], "content": item["content"][:12000]})
    return clean_history[-20:]


def _parse_profile(raw_profile: str | None) -> dict[str, Any] | None:
    if not raw_profile:
        return None
    try:
        parsed = json.loads(raw_profile)
    except (TypeError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


async def _vision_extract_text(file_bytes: bytes) -> str:
    if not settings.GOOGLE_VISION_API_KEY:
        return ""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://vision.googleapis.com/v1/images:annotate?key={settings.GOOGLE_VISION_API_KEY}",
                json={
                    "requests": [{
                        "image": {"content": base64.b64encode(file_bytes).decode("utf-8")},
                        "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                    }]
                },
            )
            response.raise_for_status()
            payload = response.json()
        text = payload["responses"][0].get("fullTextAnnotation", {}).get("text", "")
        return text.strip()
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        return ""


async def _docx_extract_text(file_bytes: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
            xml = archive.read("word/document.xml")
    except (zipfile.BadZipFile, KeyError):
        return ""
    fragment = xml.decode("utf-8", errors="ignore")
    matches = re.findall(r">([^<>]{2,})<", fragment)
    text = "\n".join(part.strip() for part in matches if part.strip())
    return text.strip()


def _pdf_extract_text(file_bytes: bytes) -> str:
    try:
        import PyPDF2
    except ImportError:
        return ""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages.append(page_text.strip())
        return "\n\n".join(pages).strip()
    except Exception:
        return ""


async def extract_attachment_text(file_bytes: bytes, filename: str) -> str:
    import mimetypes
    filename = (filename or "upload").lower()
    content_type = mimetypes.guess_type(filename)[0] or ""
    if not file_bytes:
        return ""
    if content_type.startswith("image/") or filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
        if not settings.GOOGLE_VISION_API_KEY:
            return (
                f"Uploaded image: {filename}. "
                "Image OCR is not configured on this server. Add GOOGLE_VISION_API_KEY in the backend environment to read image text."
            )
        text = await _vision_extract_text(file_bytes)
        if text:
            return text
        return f"Uploaded image: {filename}. Please use the image details to answer the user question."

    if filename.endswith(".txt"):
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1", errors="ignore")
        if text.strip():
            return text.strip()

    if filename.endswith(".docx"):
        text = await _docx_extract_text(file_bytes)
        if text:
            return text

    if filename.endswith(".pdf"):
        text = _pdf_extract_text(file_bytes)
        if text:
            return text

    if content_type in {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}:
        text = _pdf_extract_text(file_bytes)
        if text:
            return text

    if filename:
        return f"Uploaded document: {filename}. Please read the attachment and answer based on the document content."
    return "Uploaded attachment. Please review the file and answer the user question."


@router.post("/self-service/schemes-match")
@limiter.limit("20/minute")
async def match(request: Request, profile: dict[str, Any], db: AsyncSession = Depends(get_db)):
    language = profile.get("preferred_language", "en")
    if language not in localization.LANGUAGES:
        raise HTTPException(422, "Select a supported language")
    if not profile.get("age") or not (profile.get("state") or profile.get("location")):
        raise HTTPException(422, "Please complete age and state in your profile")
    try:
        matches = await asyncio.to_thread(eligibility_service.match_schemes, profile, 20, True)
    except (ValueError, TypeError):
        raise HTTPException(422, "Please check age, income and profile values")
    matches = await localization.localize_records(db, matches, language)
    return {"matches": matches, "total": len(matches),
            "translation_status": "original" if language == "en" else "unavailable" if any(row["translation_status"] != "translated" for row in matches) else "translated",
            "notice": "Preliminary screening using the supplied dataset; verify current rules on the official portal."}


@router.post("/self-service/assistant-chat")
@limiter.limit("20/minute")
async def chat(request: Request, payload: AssistantChatRequest):
    return await chatbot_service.chat(**payload.model_dump())


@router.post("/self-service/assistant-chat/upload")
@limiter.limit("20/minute")
async def chat_with_upload(
    request: Request,
    message: str = Form(default=""),
    language: str = Form(default="en"),
    history: str = Form(default="[]"),
    profile: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
):
    attachment_text = ""
    if file:
        contents = await file.read(5 * 1024 * 1024 + 1)
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(413, "Choose a file smaller than 5 MB.")
        attachment_text = await extract_attachment_text(contents, file.filename or "upload")
    final_message = message.strip()
    if attachment_text:
        if final_message:
            final_message = f"{final_message}\n\nAttachment context:\n{attachment_text}"
        else:
            final_message = attachment_text
    if not final_message:
        raise HTTPException(422, "Please enter a question or upload a document")

    payload = {
        "message": final_message,
        "language": language,
        "history": _parse_history(history),
        "phone_number": None,
        "profile": _parse_profile(profile),
    }
    return await chatbot_service.chat(**payload)
