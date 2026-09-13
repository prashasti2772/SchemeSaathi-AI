"""Bhashini pipeline discovery and inference; credentials stay server-side."""
from urllib.parse import urlsplit
import httpx
from fastapi import HTTPException
from src.config.settings import settings


def configured():
    return bool(settings.BHASHINI_USER_ID and settings.BHASHINI_API_KEY and settings.BHASHINI_PIPELINE_ID)


async def _compute(task, language, input_data, **options):
    if not configured():
        raise HTTPException(503, "Bhashini is not configured. Use the text assistant.")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(25, connect=10)) as client:
            response = await client.post(settings.BHASHINI_CONFIG_ENDPOINT, headers={
                "userID": settings.BHASHINI_USER_ID, "ulcaApiKey": settings.BHASHINI_API_KEY,
            }, json={"pipelineTasks": [{"taskType": task, "config": {"language": language}}],
                     "pipelineRequestConfig": {"pipelineId": settings.BHASHINI_PIPELINE_ID}})
            response.raise_for_status()
            data = response.json()
            candidates = [c for item in data["pipelineResponseConfig"] if item["taskType"] == task for c in item["config"]]
            selected = next((c for c in candidates if all(c.get("language", {}).get(k) == v for k,v in language.items())), None)
            if not selected:
                raise HTTPException(503, "Bhashini has no authorized model for this language. Try another language or text assistance.")
            endpoint = data["pipelineInferenceAPIEndPoint"]
            url = urlsplit(endpoint["callbackUrl"])
            if url.scheme != "https" or not url.hostname or not (url.hostname == "bhashini.gov.in" or url.hostname.endswith(".bhashini.gov.in")):
                raise ValueError("Untrusted inference endpoint")
            config = {"language": language, "serviceId": selected["serviceId"], **options}
            if task == "tts":
                voices = selected.get("supportedVoices") or ["female"]
                config["gender"] = "female" if "female" in voices else voices[0]
            key = endpoint["inferenceApiKey"]
            response = await client.post(endpoint["callbackUrl"], headers={key["name"]: key["value"]}, json={
                "pipelineTasks": [{"taskType": task, "config": config}], "inputData": input_data})
            response.raise_for_status()
            return next(item for item in response.json()["pipelineResponse"] if item["taskType"] == task)
    except HTTPException:
        raise
    except (httpx.HTTPError, KeyError, ValueError, TypeError, StopIteration, IndexError):
        raise HTTPException(503, "Bhashini could not complete this request. Check provider access or try again.")


async def speech_to_text(audio_base64: str, source_language: str) -> dict:
    result = await _compute("asr", {"sourceLanguage": source_language}, {"audio": [{"audioContent": audio_base64}]}, audioFormat="wav", samplingRate=16000)
    try:
        return {"text": result["output"][0]["source"]}
    except (KeyError, IndexError, TypeError):
        raise HTTPException(503, "Bhashini returned no transcript. Try recording again.")


async def translate_text(text: str, source_language: str, target_language: str) -> str:
    if source_language == target_language:
        return text
    result = await _compute("translation", {"sourceLanguage": source_language, "targetLanguage": target_language}, {"input": [{"source": text}]})
    try:
        translated = result["output"][0]["target"]
        if not translated.strip():
            raise ValueError()
        return translated
    except (KeyError, IndexError, TypeError, ValueError):
        raise HTTPException(503, "Bhashini returned no translation. Try again.")


async def text_to_speech(text: str, target_language: str) -> str:
    result = await _compute("tts", {"sourceLanguage": target_language}, {"input": [{"source": text}]}, audioFormat="wav", samplingRate=16000)
    try:
        return result["audio"][0]["audioContent"]
    except (KeyError, IndexError, TypeError):
        raise HTTPException(503, "Bhashini returned no audio.")


async def translate_texts(texts: list[str], source_language: str, target_language: str) -> list[str]:
    if source_language == target_language:
        return texts
    result = await _compute("translation", {"sourceLanguage": source_language, "targetLanguage": target_language}, {"input": [{"source": text} for text in texts]})
    try:
        translated = [item["target"] for item in result["output"]]
        if len(translated) != len(texts) or not all(isinstance(text, str) and text.strip() for text in translated):
            raise ValueError()
        return translated
    except (KeyError, IndexError, TypeError, ValueError):
        raise HTTPException(503, "Bhashini returned incomplete translations. Try again.")
