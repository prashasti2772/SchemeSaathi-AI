from src.config.settings import settings
from src.integrations import bhashini_client, ai_client


async def speech_to_text(audio_base64: str, language: str | None = None) -> dict:
    """Transcribes base64-encoded audio. Bhashini is the primary provider for
    Indian languages; falls back to the generic AI provider if unconfigured."""
    source_language = language or settings.BHASHINI_DEFAULT_LANGUAGE
    if settings.VOICE_AI_PROVIDER == "bhashini":
        return await bhashini_client.speech_to_text(audio_base64, source_language)
    return await ai_client.transcribe_audio(audio_base64, source_language)
