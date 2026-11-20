"""The transcription route only validates WAV audio and requests Bhashini ASR."""
import base64
import io
import wave
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.modules.public import voice_assistant


ENDPOINT = "/api/v1/public/voice/transcribe"


def wav_base64(*, channels=1, sample_width=2, sample_rate=16000, frames=1600):
    data = io.BytesIO()
    with wave.open(data, "wb") as audio:
        audio.setnchannels(channels)
        audio.setsampwidth(sample_width)
        audio.setframerate(sample_rate)
        audio.writeframes(b"\0" * frames * channels * sample_width)
    return base64.b64encode(data.getvalue()).decode("ascii")


@pytest.fixture
def transcribe_app(monkeypatch):
    monkeypatch.setattr(voice_assistant.limiter, "enabled", False)
    monkeypatch.setattr(voice_assistant.bhashini_client, "configured", lambda: True)
    speech = AsyncMock(return_value={"text": "Which documents do I need?"})
    monkeypatch.setattr(voice_assistant.bhashini_client, "speech_to_text", speech)
    forbidden = []
    for owner, method in (
        (voice_assistant.chatbot_service, "chat"),
        (voice_assistant.bhashini_client, "translate_text"),
        (voice_assistant.bhashini_client, "text_to_speech"),
    ):
        mock = AsyncMock(side_effect=AssertionError(f"Unexpected {method} call"))
        monkeypatch.setattr(owner, method, mock)
        forbidden.append(mock)
    app = FastAPI()
    app.include_router(voice_assistant.router, prefix="/api/v1")
    with TestClient(app) as client:
        yield client, speech
    for mock in forbidden:
        mock.assert_not_called()


@pytest.mark.parametrize("language", ["en", "hi", "mr", "gu", "ta", "te", "bn", "kn"])
def test_valid_wav_returns_only_transcript_without_conversation(transcribe_app, language):
    client, speech = transcribe_app
    audio = wav_base64()
    response = client.post(ENDPOINT, json={"audio_base64": audio, "language": language})
    assert response.status_code == 200
    assert response.json() == {"transcript": "Which documents do I need?"}
    speech.assert_awaited_once_with(audio, language)


def test_transcript_preserves_indian_script(transcribe_app):
    client, speech = transcribe_app
    transcript = "\u092e\u0941\u091d\u0947 \u0915\u094c\u0928 \u0938\u0947 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u091a\u093e\u0939\u093f\u090f?"
    speech.return_value = {"text": transcript}
    response = client.post(ENDPOINT, json={"audio_base64": wav_base64(), "language": "hi"})
    assert response.status_code == 200
    assert response.json() == {"transcript": transcript}


@pytest.mark.parametrize("payload", [{}, {"audio_base64": None}, {"audio_base64": ""}])
def test_audio_is_required(transcribe_app, payload):
    client, speech = transcribe_app
    response = client.post(ENDPOINT, json={"language": "en", **payload})
    assert response.status_code == 422
    speech.assert_not_called()


@pytest.mark.parametrize(
    "audio",
    [
        "not base64!",
        base64.b64encode(b"not a wave file").decode("ascii"),
        wav_base64(channels=2),
        wav_base64(sample_width=1),
        wav_base64(sample_width=3),
        wav_base64(sample_rate=44100),
        wav_base64(frames=0),
        wav_base64(frames=16000 * 45 + 1),
    ],
    ids=["invalid-base64", "not-wav", "stereo", "8-bit", "24-bit", "wrong-rate", "empty", "too-long"],
)
def test_invalid_audio_never_reaches_provider(transcribe_app, audio):
    client, speech = transcribe_app
    response = client.post(ENDPOINT, json={"audio_base64": audio, "language": "en"})
    assert response.status_code == 422
    speech.assert_not_called()


def test_exact_45_second_limit_is_accepted(transcribe_app):
    client, speech = transcribe_app
    audio = wav_base64(frames=16000 * 45)
    response = client.post(ENDPOINT, json={"audio_base64": audio, "language": "en"})
    assert response.status_code == 200
    speech.assert_awaited_once_with(audio, "en")


def test_unsupported_language_is_rejected(transcribe_app):
    client, speech = transcribe_app
    response = client.post(ENDPOINT, json={"audio_base64": wav_base64(), "language": "xx"})
    assert response.status_code == 422
    speech.assert_not_called()


def test_unconfigured_provider_is_explicit(transcribe_app, monkeypatch):
    client, speech = transcribe_app
    monkeypatch.setattr(voice_assistant.bhashini_client, "configured", lambda: False)
    response = client.post(ENDPOINT, json={"audio_base64": wav_base64(), "language": "en"})
    assert response.status_code == 503
    speech.assert_not_called()


def test_provider_failure_is_not_a_successful_transcript(transcribe_app):
    client, speech = transcribe_app
    speech.side_effect = HTTPException(503, "Bhashini is unavailable")
    response = client.post(ENDPOINT, json={"audio_base64": wav_base64(), "language": "en"})
    assert response.status_code == 503
    assert "transcript" not in response.json()


@pytest.mark.parametrize("transcript", ["", " \n\t ", None, 123])
def test_empty_provider_transcript_is_rejected(transcribe_app, transcript):
    client, speech = transcribe_app
    speech.return_value = {"text": transcript}
    response = client.post(ENDPOINT, json={"audio_base64": wav_base64(), "language": "en"})
    assert response.status_code == 422
    assert "transcript" not in response.json()
