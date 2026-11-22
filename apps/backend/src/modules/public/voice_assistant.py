import base64
import io
import wave
import re
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from src.config.settings import settings
from src.integrations import bhashini_client, sarvam_client
from src.modules.chatbot.service import chatbot_service
from src.middlewares.rate_limiter import limiter

router = APIRouter(prefix="/public/voice", tags=["Voice assistant"])

# All major Indian languages supported by Sarvam AI & SchemeSaathi
LANGUAGES = {
    "en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "od", "ur",
    "as", "kok", "mai", "ne", "sa", "sd", "brx", "doi", "mni", "sat", "ks",
}


class VoiceInput(BaseModel):
    language: str = "hi"
    audio_base64: str | None = Field(default=None, max_length=3000000)
    text: str | None = Field(default=None, max_length=2000)


class TranscriptionInput(BaseModel):
    language: str = "hi"
    audio_base64: str = Field(min_length=1, max_length=3000000)


class TTSInput(BaseModel):
    language: str = "hi"
    text: str = Field(min_length=1, max_length=3000)


class TranslatePayload(BaseModel):
    text: str = Field(min_length=1, max_length=6000)
    source_language: str = "en"
    target_language: str = "hi"


class TranslateBatchPayload(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)
    source_language: str = "en"
    target_language: str = "hi"


@router.get("/status")
async def status():
    """Return voice provider status and supported Indian languages."""
    if sarvam_client.configured():
        return {
            "configured": True,
            "provider": "sarvam",
            "tts_languages": sorted(LANGUAGES),
            "languages": sorted(LANGUAGES),
        }
    elif bhashini_client.configured():
        return {
            "configured": True,
            "provider": "bhashini",
            "tts_languages": sorted(LANGUAGES),
            "languages": sorted(LANGUAGES),
        }
    return {
        "configured": False,
        "provider": "browser",
        "languages": sorted(LANGUAGES),
    }


@router.post("/translate")
@limiter.limit("600/minute")
async def translate_text_endpoint(request: Request, payload: TranslatePayload):
    """Convert any text to any Indian language using Sarvam AI."""
    src = payload.source_language.lower().split("-")[0]
    tgt = payload.target_language.lower().split("-")[0]

    if src == tgt:
        return {"translated_text": payload.text, "target_language": tgt, "provider": "identity"}

    if sarvam_client.configured():
        translated = await sarvam_client.translate_text(payload.text, src, tgt)
        return {"translated_text": translated, "target_language": tgt, "provider": "sarvam"}
    elif bhashini_client.configured():
        translated = await bhashini_client.translate_text(payload.text, src, tgt)
        return {"translated_text": translated, "target_language": tgt, "provider": "bhashini"}

    raise HTTPException(503, "No translation service is configured. Set SARVAM_API_KEY in .env")


@router.post("/translate-batch")
@limiter.limit("600/minute")
async def translate_batch_endpoint(request: Request, payload: TranslateBatchPayload):
    """Batch convert texts to any Indian language using Sarvam AI."""
    src = payload.source_language.lower().split("-")[0]
    tgt = payload.target_language.lower().split("-")[0]

    if src == tgt:
        return {"translations": {t: t for t in payload.texts}, "target_language": tgt, "provider": "identity"}

    if sarvam_client.configured():
        translations = await sarvam_client.translate_batch(payload.texts, src, tgt)
        return {"translations": translations, "target_language": tgt, "provider": "sarvam"}
    elif bhashini_client.configured():
        translations = {}
        for t in payload.texts:
            translations[t] = await bhashini_client.translate_text(t, src, tgt)
        return {"translations": translations, "target_language": tgt, "provider": "bhashini"}

    raise HTTPException(503, "No translation service is configured. Set SARVAM_API_KEY in .env")


@router.post("/tts")
@limiter.limit("30/minute")
async def text_to_speech(request: Request, payload: TTSInput):
    """Convert text to natural speech in any Indian language."""
    lang = payload.language.lower().split("-")[0]
    if lang not in LANGUAGES:
        raise HTTPException(422, f"Unsupported language: {payload.language}")

    spoken = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", payload.text)
    spoken = re.sub(r"https?://\S+|[#*`_~>]", " ", spoken).strip()
    if not spoken:
        raise HTTPException(422, "No text received")

    # 1. Prefer Sarvam AI (ultra-high fidelity Bulbul:v3 Indic voices)
    if sarvam_client.configured():
        try:
            audio = await sarvam_client.text_to_speech(spoken[:3000], lang)
            return {"audio_base64": audio, "audio_mime_type": "audio/wav", "provider": "sarvam"}
        except Exception as e:
            if not bhashini_client.configured():
                raise HTTPException(503, f"Sarvam TTS failed: {e}")

    # 2. Fallback to Bhashini
    if bhashini_client.configured():
        audio = await bhashini_client.text_to_speech(spoken[:2500], lang)
        return {"audio_base64": audio, "audio_mime_type": "audio/wav", "provider": "bhashini"}

    raise HTTPException(503, "Voice synthesis is not configured. Set SARVAM_API_KEY in .env")


def validate_wav(audio_base64: str):
    """Validate a mono, 16 kHz, 16-bit WAV of at most 45 seconds."""
    try:
        audio = base64.b64decode(audio_base64, validate=False)
        if len(audio) < 44 or not audio.startswith(b"RIFF"):
            raise HTTPException(422, "Invalid WAV audio")
        with wave.open(io.BytesIO(audio), "rb") as wav:
            channels = wav.getnchannels()
            sample_width = wav.getsampwidth()
            sample_rate = wav.getframerate()
            frames = wav.getnframes()
        if channels != 1:
            raise HTTPException(422, "Audio must be mono")
        if sample_width != 2:
            raise HTTPException(422, "Audio must use 16-bit samples")
        if sample_rate != 16000:
            raise HTTPException(422, "Audio must use a 16 kHz sample rate")
        if frames <= 0 or frames / sample_rate > 45:
            raise HTTPException(422, "Audio must be between 1 frame and 45 seconds")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Invalid WAV audio")


@router.post("/transcribe")
@limiter.limit("20/minute")
async def transcribe(request: Request, payload: TranscriptionInput):
    """Convert spoken voice in any Indian language to text."""
    lang = payload.language.lower().split("-")[0]
    if lang not in LANGUAGES:
        raise HTTPException(422, f"Unsupported language: {payload.language}")

    validate_wav(payload.audio_base64)

    # 1. Prefer Sarvam AI Saarika v2.5 ASR
    if sarvam_client.configured():
        try:
            res = await sarvam_client.speech_to_text(payload.audio_base64, lang)
            return {"transcript": res["text"]}
        except Exception as e:
            if not bhashini_client.configured():
                raise HTTPException(503, f"Sarvam ASR failed: {e}")

    # 2. Fallback to Bhashini
    if bhashini_client.configured():
        result = await bhashini_client.speech_to_text(payload.audio_base64, lang)
        transcript = result.get("text")
        if not isinstance(transcript, str) or not transcript.strip():
            raise HTTPException(422, "No speech received")
        return {"transcript": transcript}

    raise HTTPException(503, "Speech-to-text is not configured. Set SARVAM_API_KEY in .env")


@router.post("/chat")
@limiter.limit("20/minute")
async def voice_chat(request: Request, payload: VoiceInput):
    """End-to-end multilingual voice agent for chatbot in any Indian language."""
    lang = payload.language.lower().split("-")[0]
    if lang not in LANGUAGES:
        raise HTTPException(422, f"Unsupported language: {payload.language}")

    transcript = payload.text

    # Transcribe if audio received
    if payload.audio_base64:
        validate_wav(payload.audio_base64)
        if sarvam_client.configured():
            stt_res = await sarvam_client.speech_to_text(payload.audio_base64, lang)
            transcript = stt_res["text"]
        elif bhashini_client.configured():
            transcript = (await bhashini_client.speech_to_text(payload.audio_base64, lang))["text"]
        else:
            raise HTTPException(503, "Voice transcription is not configured. Set SARVAM_API_KEY in .env")

    if not transcript or not transcript.strip():
        raise HTTPException(422, "No speech or text received")

    # If query is in regional language, translate to English for retrieval
    query = transcript
    if lang != "en":
        if sarvam_client.configured():
            query = await sarvam_client.translate_text(transcript, lang, "en")
        elif bhashini_client.configured():
            query = await bhashini_client.translate_text(transcript, lang, "en")

    # Chatbot processing
    answer = await chatbot_service.chat(query, language="en")
    reply = answer["reply"]

    # Translate answer back to user's selected Indian language
    if lang != "en":
        if sarvam_client.configured():
            reply = await sarvam_client.translate_text(reply, "en", lang)
        elif bhashini_client.configured():
            reply = await bhashini_client.translate_text(reply, "en", lang)

    # Convert answer to speech
    warning = None
    audio = None
    spoken = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", reply)
    spoken = re.sub(r"https?://\S+|[#*`_~>]", " ", spoken).strip()

    try:
        if sarvam_client.configured():
            audio = await sarvam_client.text_to_speech(spoken[:3000], lang)
        elif bhashini_client.configured():
            audio = await bhashini_client.text_to_speech(spoken[:2500], lang)
    except Exception:
        warning = "Audio synthesis unavailable. You can read the answer below."

    provider = "sarvam" if sarvam_client.configured() else "bhashini"
    return {
        "transcript": transcript,
        "reply": reply,
        "audio_base64": audio,
        "audio_mime_type": "audio/wav",
        "warning": warning,
        "provider": provider,
        "language": lang,
    }
