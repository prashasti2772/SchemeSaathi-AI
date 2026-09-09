from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rbac_middleware import require_any_staff
from src.middlewares.webhook_verification import verify_telephony_webhook
from src.modules.voice import service
from src.modules.voice.schemas import AudioTurnRequest, AudioTurnResult, CallSessionOut, MissedCallWebhook, TranscriptOut, TranscriptTurnCreate

router = APIRouter(prefix="/voice", tags=["Voice"])
webhook_router = APIRouter(prefix="/voice", tags=["Voice Webhooks"], dependencies=[Depends(verify_telephony_webhook)])


@webhook_router.post("/webhook/missed-call", response_model=CallSessionOut)
async def missed_call_webhook(payload: MissedCallWebhook, db: AsyncSession = Depends(get_db)):
    return await service.handle_missed_call(db, payload)


@router.post("/calls/{call_session_id}/start-callback", response_model=CallSessionOut)
async def start_callback(call_session_id: str, db: AsyncSession = Depends(get_db)):
    return await service.start_callback(db, call_session_id)


@router.post("/calls/{call_session_id}/audio-turn", response_model=AudioTurnResult)
async def audio_turn(call_session_id: str, payload: AudioTurnRequest, db: AsyncSession = Depends(get_db)):
    """Accepts one utterance of recorded beneficiary audio, transcribes it via
    Bhashini, advances the conversation, and returns the next spoken prompt."""
    return await service.process_audio_turn(db, call_session_id, payload.audio_base64, payload.language)


@router.post("/calls/{call_session_id}/transcript", response_model=TranscriptOut)
async def record_transcript_turn(call_session_id: str, payload: TranscriptTurnCreate, db: AsyncSession = Depends(get_db)):
    return await service.record_transcript_turn(db, call_session_id, payload)


@router.post("/calls/{call_session_id}/complete", response_model=CallSessionOut)
async def complete_call(call_session_id: str, db: AsyncSession = Depends(get_db)):
    return await service.complete_call(db, call_session_id)


@router.get("/calls/{call_session_id}", response_model=CallSessionOut, dependencies=[Depends(require_any_staff)])
async def get_call_session(call_session_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_call_session(db, call_session_id)
