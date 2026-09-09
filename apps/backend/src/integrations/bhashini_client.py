import httpx
from fastapi import HTTPException
from src.config.logging import get_logger
from src.config.settings import settings
from src.integrations import ai_client

logger = get_logger("bhashini_client")
_HTTP_TIMEOUT = 30.0


async def speech_to_text(audio_base64: str, source_language: str) -> dict:
    """Transcribes audio using Bhashini pipeline (ULCA-Dhruva).
    Falls back to ai_client if Bhashini credentials are not configured or request fails.
    """
    if not settings.BHASHINI_USER_ID or not settings.BHASHINI_API_KEY:
        logger.info("bhashini_credentials_missing_using_fallback")
        raise HTTPException(503, "Bhashini speech recognition unavailable")

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            # First fetch pipeline compute endpoint config if needed
            headers = {
                "userID": settings.BHASHINI_USER_ID,
                "ulcaApiKey": settings.BHASHINI_API_KEY,
                "Content-Type": "application/json",
            }
            config_payload = {
                "pipelineTasks": [
                    {
                        "taskType": "asr",
                        "config": {
                            "language": {"sourceLanguage": source_language}
                        }
                    }
                ],
                "pipelineRequestConfig": {
                    "pipelineId": settings.BHASHINI_PIPELINE_ID
                }
            }
            resp = await client.post(settings.BHASHINI_CONFIG_ENDPOINT, headers=headers, json=config_payload)
            resp.raise_for_status()
            config_data = resp.json()

            task_config = config_data["pipelineResponseConfig"][0]["config"][0]
            service_id = task_config["serviceId"]
            compute_url = config_data["pipelineInferenceAPIEndPoint"]["callbackUrl"]
            inference_headers = {
                config_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["name"]:
                config_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["value"],
                "Content-Type": "application/json"
            }

            compute_payload = {
                "pipelineTasks": [
                    {
                        "taskType": "asr",
                        "config": {
                            "language": {"sourceLanguage": source_language},
                            "serviceId": service_id,
                            "audioFormat": "wav",
                            "samplingRate": 16000
                        }
                    }
                ],
                "inputData": {
                    "audio": [{"audioContent": audio_base64}]
                }
            }

            compute_resp = await client.post(compute_url, headers=inference_headers, json=compute_payload)
            compute_resp.raise_for_status()
            res_json = compute_resp.json()
            source_text = res_json["pipelineResponse"][0]["output"][0]["source"]
            return {"text": source_text, "confidence": 0.9}
    except Exception as exc:
        logger.error("bhashini_stt_failed", error=str(exc))
        raise HTTPException(503, "Bhashini speech recognition unavailable")


async def text_to_speech(text: str, target_language: str) -> str:
    """Synthesizes speech using Bhashini TTS.
    Falls back to ai_client if unconfigured or fails.
    """
    if not settings.BHASHINI_USER_ID or not settings.BHASHINI_API_KEY:
        logger.info("bhashini_credentials_missing_using_fallback")
        raise HTTPException(503, "Bhashini speech synthesis unavailable")

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            headers = {
                "userID": settings.BHASHINI_USER_ID,
                "ulcaApiKey": settings.BHASHINI_API_KEY,
                "Content-Type": "application/json",
            }
            config_payload = {
                "pipelineTasks": [
                    {
                        "taskType": "tts",
                        "config": {
                            "language": {"sourceLanguage": target_language}
                        }
                    }
                ],
                "pipelineRequestConfig": {
                    "pipelineId": settings.BHASHINI_PIPELINE_ID
                }
            }
            resp = await client.post(settings.BHASHINI_CONFIG_ENDPOINT, headers=headers, json=config_payload)
            resp.raise_for_status()
            config_data = resp.json()

            task_config = config_data["pipelineResponseConfig"][0]["config"][0]
            service_id = task_config["serviceId"]
            compute_url = config_data["pipelineInferenceAPIEndPoint"]["callbackUrl"]
            inference_headers = {
                config_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["name"]:
                config_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["value"],
                "Content-Type": "application/json"
            }

            compute_payload = {
                "pipelineTasks": [
                    {
                        "taskType": "tts",
                        "config": {
                            "language": {"sourceLanguage": target_language},
                            "serviceId": service_id,
                            "gender": "female"
                        }
                    }
                ],
                "inputData": {
                    "input": [{"source": text}]
                }
            }

            compute_resp = await client.post(compute_url, headers=inference_headers, json=compute_payload)
            compute_resp.raise_for_status()
            res_json = compute_resp.json()
            audio_content = res_json["pipelineResponse"][0]["audio"][0]["audioContent"]
            return audio_content
    except Exception as exc:
        logger.error("bhashini_tts_failed", error=str(exc))
        raise HTTPException(503, "Bhashini speech synthesis unavailable")


async def translate_text(text: str, source_language: str, target_language: str) -> str:
    """Translates text across Indian languages using Bhashini NMT.
    Falls back to text if unconfigured or fails.
    """
    if not settings.BHASHINI_USER_ID or not settings.BHASHINI_API_KEY:
        raise HTTPException(503, "Bhashini translation unavailable")

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            headers = {
                "userID": settings.BHASHINI_USER_ID,
                "ulcaApiKey": settings.BHASHINI_API_KEY,
                "Content-Type": "application/json",
            }
            config_payload = {
                "pipelineTasks": [
                    {
                        "taskType": "translation",
                        "config": {
                            "language": {
                                "sourceLanguage": source_language,
                                "targetLanguage": target_language
                            }
                        }
                    }
                ],
                "pipelineRequestConfig": {
                    "pipelineId": settings.BHASHINI_PIPELINE_ID
                }
            }
            resp = await client.post(settings.BHASHINI_CONFIG_ENDPOINT, headers=headers, json=config_payload)
            resp.raise_for_status()
            config_data = resp.json()

            task_config = config_data["pipelineResponseConfig"][0]["config"][0]
            service_id = task_config["serviceId"]
            compute_url = config_data["pipelineInferenceAPIEndPoint"]["callbackUrl"]
            inference_headers = {
                config_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["name"]:
                config_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["value"],
                "Content-Type": "application/json"
            }

            compute_payload = {
                "pipelineTasks": [
                    {
                        "taskType": "translation",
                        "config": {
                            "language": {
                                "sourceLanguage": source_language,
                                "targetLanguage": target_language
                            },
                            "serviceId": service_id
                        }
                    }
                ],
                "inputData": {
                    "input": [{"source": text}]
                }
            }

            compute_resp = await client.post(compute_url, headers=inference_headers, json=compute_payload)
            compute_resp.raise_for_status()
            res_json = compute_resp.json()
            target_text = res_json["pipelineResponse"][0]["output"][0]["target"]
            return target_text
    except Exception as exc:
        logger.error("bhashini_translation_failed", error=str(exc))
        raise HTTPException(503, "Bhashini translation unavailable")
