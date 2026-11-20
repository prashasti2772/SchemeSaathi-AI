from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.integrations.telephony_client import initiate_callback
from src.middlewares.error_handler import BusinessRuleException, NotFoundException
from src.modules.beneficiaries.models import Beneficiary
from src.modules.beneficiaries.repository import get_by_phone
from src.modules.voice.conversation_state import (
    COMPLETION_PROMPT,
    CONSENT_PROMPT,
    get_next_question_field,
    get_prompt_for_field,
    interpret_consent_response,
    is_profile_complete,
    record_answer,
)
from src.modules.voice.models import CallDirection, CallSession, CallStatus, Speaker, Transcript
from src.modules.voice.schemas import AudioTurnResult, MissedCallWebhook, TranscriptTurnCreate
from src.modules.voice.stt_client import speech_to_text
from src.modules.voice.tts_client import text_to_speech, translate_prompt
from src.utils.formatters import normalize_phone_number


async def handle_missed_call(db: AsyncSession, payload: MissedCallWebhook) -> CallSession:
    normalized_phone = normalize_phone_number(payload.phone_number)
    beneficiary = await get_by_phone(db, normalized_phone)
    if not beneficiary:
        beneficiary = Beneficiary(phone_number=normalized_phone)
        db.add(beneficiary)
        await db.flush()

    call_session = CallSession(
        beneficiary_id=beneficiary.id,
        phone_number=normalized_phone,
        direction=CallDirection.INBOUND_MISSED_CALL,
        status=CallStatus.RINGING,
        provider_call_sid=payload.provider_call_sid,
    )
    db.add(call_session)
    await db.commit()
    await db.refresh(call_session)
    return call_session


async def start_callback(db: AsyncSession, call_session_id: str) -> CallSession:
    call_session = await _get_call_session(db, call_session_id)
    provider_call_sid = await initiate_callback(call_session.phone_number)
    if not provider_call_sid:
        raise BusinessRuleException("Unable to place the callback with the telephony provider right now")
    call_session.direction = CallDirection.OUTBOUND_CALLBACK
    call_session.status = CallStatus.IN_PROGRESS
    call_session.started_at = datetime.now(timezone.utc)
    call_session.provider_call_sid = provider_call_sid
    await db.commit()
    await db.refresh(call_session)
    return call_session


async def process_audio_turn(db: AsyncSession, call_session_id: str, audio_base64: str, language: str) -> AudioTurnResult:
    """One IVR round trip: transcribe the beneficiary's speech, store it, work
    out the next question (or consent/completion prompt), and synthesize it."""
    call_session = await _get_call_session(db, call_session_id)

    transcription = await speech_to_text(audio_base64, language)
    beneficiary_text = transcription["text"]
    if beneficiary_text:
        await record_transcript_turn(
            db, call_session_id, TranscriptTurnCreate(speaker=Speaker.BENEFICIARY, text=beneficiary_text, confidence=transcription["confidence"])
        )
        await db.refresh(call_session)

    if call_session.conversation_state.get("consent_declined"):
        prompt_text = "No problem. We will not proceed further. Thank you for your time."
    elif not call_session.conversation_state.get("consent_given"):
        prompt_text = CONSENT_PROMPT
    else:
        next_field = get_next_question_field(call_session.conversation_state)
        prompt_text = get_prompt_for_field(next_field) if next_field else COMPLETION_PROMPT

    localized_prompt = await translate_prompt(prompt_text, language)
    prompt_audio_base64 = await text_to_speech(localized_prompt, language)

    await record_transcript_turn(db, call_session_id, TranscriptTurnCreate(speaker=Speaker.SYSTEM, text=localized_prompt, confidence=None))

    return AudioTurnResult(
        beneficiary_transcript=beneficiary_text,
        prompt_text=localized_prompt,
        prompt_audio_base64=prompt_audio_base64,
        conversation_complete=is_profile_complete(call_session.conversation_state),
    )


async def record_transcript_turn(db: AsyncSession, call_session_id: str, payload: TranscriptTurnCreate) -> Transcript:
    call_session = await _get_call_session(db, call_session_id)
    transcript = Transcript(call_session_id=call_session.id, speaker=payload.speaker, text=payload.text, confidence=payload.confidence)
    db.add(transcript)

    if payload.speaker == Speaker.BENEFICIARY:
        if not call_session.conversation_state.get("consent_given") and not call_session.conversation_state.get("consent_declined"):
            consent = interpret_consent_response(payload.text)
            if consent is True:
                call_session.conversation_state = {**call_session.conversation_state, "consent_given": True}
            elif consent is False:
                call_session.conversation_state = {**call_session.conversation_state, "consent_declined": True}
                call_session.status = CallStatus.COMPLETED
                call_session.ended_at = datetime.now(timezone.utc)
        elif call_session.conversation_state.get("consent_given"):
            pending_field = get_next_question_field(call_session.conversation_state)
            if pending_field:
                try:
                    call_session.conversation_state = record_answer(call_session.conversation_state, pending_field, payload.text)
                except ValueError as exc:
                    raise BusinessRuleException(str(exc)) from exc

    await db.commit()
    await db.refresh(transcript)
    return transcript


async def complete_call(db: AsyncSession, call_session_id: str) -> CallSession:
    call_session = await _get_call_session(db, call_session_id)
    call_session.status = CallStatus.COMPLETED
    call_session.ended_at = datetime.now(timezone.utc)

    if is_profile_complete(call_session.conversation_state) and call_session.beneficiary_id:
        beneficiary_result = await db.execute(select(Beneficiary).where(Beneficiary.id == call_session.beneficiary_id))
        beneficiary = beneficiary_result.scalar_one_or_none()
        if beneficiary:
            collected = call_session.conversation_state.get("collected_fields", {})
            for field, value in collected.items():
                if hasattr(beneficiary, field):
                    setattr(beneficiary, field, value)
            from src.modules.beneficiaries.models import JourneyState

            beneficiary.journey_state = JourneyState.PROFILED

    await db.commit()
    await db.refresh(call_session)
    return call_session


async def get_call_session(db: AsyncSession, call_session_id: str) -> CallSession:
    return await _get_call_session(db, call_session_id)


async def _get_call_session(db: AsyncSession, call_session_id: str) -> CallSession:
    result = await db.execute(select(CallSession).where(CallSession.id == call_session_id))
    call_session = result.scalar_one_or_none()
    if not call_session:
        raise NotFoundException("Call session not found")
    return call_session
