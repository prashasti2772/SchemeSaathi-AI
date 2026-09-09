import base64
import httpx
from src.config.settings import settings
from src.config.logging import get_logger

logger = get_logger("ai_client")
_HTTP_TIMEOUT = 30.0


async def transcribe_audio(audio_base64: str, language: str) -> dict:
    """Fallback STT via OpenAI-compatible Whisper endpoint (multipart upload)."""
    try:
        audio_bytes = base64.b64decode(audio_base64)
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.post(
                f"{settings.AI_PROVIDER_BASE_URL}/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.AI_PROVIDER_API_KEY}"},
                data={"model": "whisper-1", "language": language},
                files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            )
            response.raise_for_status()
            data = response.json()
            return {"text": data.get("text", ""), "confidence": 1.0}
    except (httpx.HTTPError, ValueError) as exc:
        logger.error("stt_request_failed", error=str(exc))
        return {"text": "", "confidence": 0.0}


async def synthesize_speech(text: str, language: str) -> str:
    """Fallback TTS via OpenAI-compatible endpoint; returns base64 audio."""
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.post(
                f"{settings.AI_PROVIDER_BASE_URL}/audio/speech",
                headers={"Authorization": f"Bearer {settings.AI_PROVIDER_API_KEY}"},
                json={"model": "tts-1", "input": text, "voice": "alloy"},
            )
            response.raise_for_status()
            return base64.b64encode(response.content).decode()
    except httpx.HTTPError as exc:
        logger.error("tts_request_failed", error=str(exc))
        return ""


async def chat_completion(messages: list[dict], max_tokens: int = 400) -> str:
    """General-purpose chat call against an OpenAI-compatible endpoint.
    Used for the citizen-facing AI assistant and natural-language
    explanations -- never for eligibility decisions themselves."""
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.post(
                f"{settings.AI_PROVIDER_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.AI_PROVIDER_API_KEY}"},
                json={"model": settings.AI_CHAT_MODEL, "messages": messages, "max_tokens": max_tokens},
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError) as exc:
        logger.error("llm_chat_failed", error=str(exc))
        return ""


async def generate_natural_language_explanation(prompt: str) -> str:
    return await chat_completion([{"role": "user", "content": prompt}], max_tokens=200)
