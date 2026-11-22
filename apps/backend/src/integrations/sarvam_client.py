"""Sarvam AI client for multilingual Indian language Translation, STT and TTS."""
import asyncio
import base64
import io
import os
import re
import httpx
from fastapi import HTTPException
from src.config.settings import settings
from src.config.logging import get_logger

logger = get_logger("sarvam_client")

SARVAM_BASE_URL = "https://api.sarvam.ai"

# Standard ISO-639-1 to Sarvam BCP-47 locale mapping
SARVAM_LANG_MAP = {
    "hi": "hi-IN",
    "bn": "bn-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "pa": "pa-IN",
    "od": "od-IN",
    "or": "od-IN",
    "en": "en-IN",
    "ur": "ur-IN",
    "as": "as-IN",
    "kok": "kok-IN",
    "mai": "mai-IN",
    "ne": "ne-IN",
    "sa": "sa-IN",
    "sd": "sd-IN",
    "brx": "brx-IN",
    "doi": "doi-IN",
    "mni": "mni-IN",
    "sat": "sat-IN",
    "ks": "ks-IN",
}

SUPPORTED_LANGUAGES = list(SARVAM_LANG_MAP.keys())

# In-memory translation cache (src, tgt, text) -> translated_text
_TRANSLATION_CACHE: dict[tuple[str, str, str], str] = {}


def configured() -> bool:
    """Return True if Sarvam AI is configured."""
    key = settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", "")
    return bool(key and key.strip())


def _get_api_key() -> str:
    key = settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", "")
    return key.strip()


def _to_sarvam_locale(lang: str) -> str:
    cleaned = str(lang or "en").lower().split("-")[0]
    return SARVAM_LANG_MAP.get(cleaned, "hi-IN")


def _chunk_text(text: str, max_chunk_len: int = 800) -> list[str]:
    """Split text cleanly on sentence or paragraph boundaries."""
    if len(text) <= max_chunk_len:
        return [text]

    chunks = []
    paragraphs = text.split("\n\n")
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 <= max_chunk_len:
            current = (current + "\n\n" + para).strip()
        else:
            if current:
                chunks.append(current)
                current = ""
            if len(para) <= max_chunk_len:
                current = para
            else:
                sentences = re.split(r"(?<=[.!?।])\s+", para)
                for s in sentences:
                    if len(current) + len(s) + 1 <= max_chunk_len:
                        current = (current + " " + s).strip()
                    else:
                        if current:
                            chunks.append(current)
                        current = s
    if current:
        chunks.append(current)

    return [c for c in chunks if c.strip()]


async def translate_text(text: str, source_language: str = "en", target_language: str = "hi") -> str:
    """Translate text between English and any Indian language using Sarvam AI."""
    if not text or not str(text).strip():
        return text

    src = str(source_language).lower().split("-")[0]
    tgt = str(target_language).lower().split("-")[0]

    if src == tgt:
        return text

    clean_text = str(text).strip()
    cache_key = (src, tgt, clean_text)
    if cache_key in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[cache_key]

    if not configured():
        raise HTTPException(503, "Sarvam AI is not configured. Set SARVAM_API_KEY in .env")

    headers = {
        "api-subscription-key": _get_api_key(),
        "Content-Type": "application/json",
    }

    chunks = _chunk_text(clean_text, max_chunk_len=800)
    translated_chunks = []

    async with httpx.AsyncClient(timeout=httpx.Timeout(30, connect=10)) as client:
        for chunk in chunks:
            # Primary: sarvam-translate:v1 (supports all Indian languages including Marathi, Urdu, etc.)
            payload = {
                "input": chunk,
                "source_language_code": _to_sarvam_locale(src),
                "target_language_code": _to_sarvam_locale(tgt),
                "model": "sarvam-translate:v1",
            }
            try:
                response = await client.post(f"{SARVAM_BASE_URL}/translate", headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    translated_chunks.append(data.get("translated_text", chunk))
                else:
                    # Fallback: mayura:v1
                    fallback_payload = {**payload, "mode": "formal", "model": "mayura:v1"}
                    fb_res = await client.post(f"{SARVAM_BASE_URL}/translate", headers=headers, json=fallback_payload)
                    if fb_res.status_code == 200:
                        translated_chunks.append(fb_res.json().get("translated_text", chunk))
                    else:
                        logger.warning("sarvam_translate_error", status=response.status_code, body=response.text[:200])
                        translated_chunks.append(chunk)
            except Exception as e:
                logger.warning("sarvam_translate_exception", error=str(e))
                translated_chunks.append(chunk)

    result = "\n\n".join(translated_chunks)
    if result and result != clean_text:
        _TRANSLATION_CACHE[cache_key] = result
    return result


async def translate_batch(texts: list[str], source_language: str = "en", target_language: str = "hi") -> dict[str, str]:
    """Concurrently translate a list of texts using Sarvam AI with caching and concurrency control."""
    src = str(source_language).lower().split("-")[0]
    tgt = str(target_language).lower().split("-")[0]

    if src == tgt:
        return {t: t for t in texts}

    results: dict[str, str] = {}
    uncached: list[str] = []

    for t in texts:
        if not t or not str(t).strip():
            results[t] = t
            continue
        clean = str(t).strip()
        key = (src, tgt, clean)
        if key in _TRANSLATION_CACHE:
            results[t] = _TRANSLATION_CACHE[key]
        else:
            uncached.append(clean)

    if not uncached:
        return results

    sem = asyncio.Semaphore(12)

    async def _worker(item: str):
        async with sem:
            translated = await translate_text(item, src, tgt)
            return item, translated

    unique_items = list(set(uncached))
    tasks = [_worker(item) for item in unique_items]
    outcomes = await asyncio.gather(*tasks, return_exceptions=True)

    for outcome in outcomes:
        if isinstance(outcome, tuple):
            item, translated = outcome
            _TRANSLATION_CACHE[(src, tgt, item)] = translated
            results[item] = translated

    for t in texts:
        if t not in results:
            clean = str(t).strip()
            results[t] = results.get(clean, t)

    return results


async def speech_to_text(audio_base64: str, language: str = "hi") -> dict:
    """Transcribe user speech to text in any Indian language using Sarvam Saarika."""
    if not configured():
        raise HTTPException(503, "Sarvam AI is not configured. Set SARVAM_API_KEY in .env")

    try:
        audio_bytes = base64.b64decode(audio_base64, validate=False)
    except Exception as e:
        raise HTTPException(422, f"Invalid audio base64: {e}")

    headers = {
        "api-subscription-key": _get_api_key(),
    }

    files = {
        "file": ("audio.wav", io.BytesIO(audio_bytes), "audio/wav"),
    }
    data = {
        "model": "saarika:v2.5",
        "language_code": _to_sarvam_locale(language),
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(40, connect=10)) as client:
            response = await client.post(
                f"{SARVAM_BASE_URL}/speech-to-text",
                headers=headers,
                files=files,
                data=data,
            )
            if response.status_code == 200:
                res = response.json()
                transcript = res.get("transcript", "").strip()
                if not transcript:
                    raise HTTPException(422, "No speech detected in audio")
                return {"text": transcript, "language_code": res.get("language_code", language)}
            else:
                logger.warning("sarvam_stt_error", status=response.status_code, body=response.text[:200])
                raise HTTPException(503, f"Sarvam STT failed: {response.text[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("sarvam_stt_exception", error=str(e))
        raise HTTPException(503, f"Sarvam speech-to-text error: {e}")


async def text_to_speech(text: str, language: str = "hi", speaker: str = "kavya") -> str:
    """Convert text to speech in any Indian language using Sarvam Bulbul:v3."""
    if not text or not text.strip():
        raise HTTPException(422, "No text provided for speech synthesis")

    if not configured():
        raise HTTPException(503, "Sarvam AI is not configured. Set SARVAM_API_KEY in .env")

    # Clean markdown and formatting
    cleaned = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", text)
    cleaned = re.sub(r"https?://\S+|[#*`_~>]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned:
        raise HTTPException(422, "No speakable text received")

    # Sarvam Bulbul:v3 accepts inputs as a list of chunks (<= 500 chars per item)
    sentences = re.split(r"(?<=[.!?।\n])\s+", cleaned)
    chunks = []
    current = ""
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if len(current) + len(s) + 1 <= 450:
            current = (current + " " + s).strip()
        else:
            if current:
                chunks.append(current)
            current = s[:450]
    if current:
        chunks.append(current)

    if not chunks:
        chunks = [cleaned[:450]]

    # Bulbul v3 supports up to 10 inputs in one batch
    inputs_to_send = chunks[:8]

    headers = {
        "api-subscription-key": _get_api_key(),
        "Content-Type": "application/json",
    }

    payload = {
        "inputs": inputs_to_send,
        "target_language_code": _to_sarvam_locale(language),
        "speaker": speaker,
        "model": "bulbul:v3",
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(35, connect=10)) as client:
            response = await client.post(
                f"{SARVAM_BASE_URL}/text-to-speech",
                headers=headers,
                json=payload,
            )
            if response.status_code == 200:
                data = response.json()
                audios = data.get("audios", [])
                if audios and isinstance(audios[0], str):
                    return audios[0]
                raise HTTPException(500, "No audio returned by Sarvam TTS")
            else:
                logger.warning("sarvam_tts_error", status=response.status_code, body=response.text[:200])
                raise HTTPException(503, f"Sarvam TTS failed: {response.text[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("sarvam_tts_exception", error=str(e))
        raise HTTPException(503, f"Sarvam text-to-speech error: {e}")
