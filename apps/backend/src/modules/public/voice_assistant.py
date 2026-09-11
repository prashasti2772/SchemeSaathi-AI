import base64
import io
import wave
import re
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from src.config.settings import settings
from src.integrations import bhashini_client
from src.modules.chatbot.service import chatbot_service
from src.middlewares.rate_limiter import limiter

router = APIRouter(prefix="/public/voice", tags=["Voice assistant"])
LANGUAGES = {"en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "ur"}
class VoiceInput(BaseModel):
    language: str = "hi"
    audio_base64: str | None = Field(default=None, max_length=3000000)
    text: str | None = Field(default=None, max_length=2000)

@router.get("/status")
async def status():
    return {"configured": bhashini_client.configured(),
            "provider": "bhashini", "languages": sorted(LANGUAGES)}

@router.post("/chat")
@limiter.limit("10/minute")
async def voice_chat(request: Request, payload: VoiceInput):
    if payload.language not in LANGUAGES:
        raise HTTPException(422, "Unsupported language")
    if not bhashini_client.configured():
        raise HTTPException(503, "Bhashini is not configured. Use the text assistant or browser voice mode.")
    transcript = payload.text
    if payload.audio_base64:
        try:
            audio = base64.b64decode(payload.audio_base64, validate=True)
            with wave.open(io.BytesIO(audio)) as wav:
                if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getframerate() != 16000 or not 0 < wav.getnframes() <= 16000 * 45:
                    raise ValueError()
        except (ValueError, wave.Error, EOFError):
            raise HTTPException(422, "Use mono 16-bit PCM WAV at 16000 Hz, maximum 45 seconds")
        transcript = (await bhashini_client.speech_to_text(payload.audio_base64, payload.language))["text"]
    if not transcript or not transcript.strip():
        raise HTTPException(422, "No speech or text received")
    query = transcript
    if payload.language != "en":
        query = await bhashini_client.translate_text(transcript, payload.language, "en")
    answer = await chatbot_service.chat(query)
    reply = answer["reply"]
    if payload.language != "en":
        reply = await bhashini_client.translate_text(reply, "en", payload.language)
    warning = None
    audio = None
    spoken = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", reply)
    spoken = re.sub(r"https?://\S+|[#*]", "", spoken)
    try:
        audio = await bhashini_client.text_to_speech(spoken[:2500], payload.language)
    except HTTPException:
        warning = "The answer is ready, but Bhashini audio is unavailable. Read the answer below or try again."
    return {"transcript": transcript, "reply": reply, "audio_base64": audio, "audio_mime_type": "audio/wav", "warning": warning, "provider": "bhashini"}

