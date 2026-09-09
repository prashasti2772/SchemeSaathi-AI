from src.config.settings import settings
from src.integrations import bhashini_client, ai_client


async def text_to_speech(text: str, language: str | None = None) -> str:
    """Synthesizes speech for a prompt and returns base64-encoded audio."""
    target_language = language or settings.BHASHINI_DEFAULT_LANGUAGE
    if settings.VOICE_AI_PROVIDER == "bhashini":
        return await bhashini_client.text_to_speech(text, target_language)
    return await ai_client.synthesize_speech(text, target_language)


async def translate_prompt(text: str, target_language: str) -> str:
    """Translates an English prompt into the beneficiary's language before TTS."""
    if settings.VOICE_AI_PROVIDER == "bhashini" and target_language != "en":
        return await bhashini_client.translate_text(text, "en", target_language)
    return text
