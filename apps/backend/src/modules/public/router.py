from typing import Any
import asyncio
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from src.modules.chatbot.service import chatbot_service
from src.modules.eligibility.service import eligibility_service
from src.middlewares.rate_limiter import limiter
from src.integrations import bhashini_client

router = APIRouter(prefix="/public", tags=["Public"])
class AssistantChatRequest(BaseModel):
    language: str = Field(default="en", pattern="^(en|hi|bn|ta|te|mr|gu|kn|ml|pa|or|ur)$")
    message: str = Field(min_length=1, max_length=2000)
    history: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    phone_number: str | None = None
    profile: dict[str, Any] | None = None

@router.post("/self-service/schemes-match")
@limiter.limit("20/minute")
async def match(request: Request, profile: dict[str, Any]):
    if not profile.get("age") or not (profile.get("state") or profile.get("location")):
        raise HTTPException(422, "Please complete age and state in your profile")
    try:
        matches = await asyncio.to_thread(eligibility_service.match_schemes, profile, 20, True)
    except (ValueError, TypeError):
        raise HTTPException(422, "Please check age, income and profile values")
    return {"matches": matches, "total": len(matches),
            "notice": "Preliminary screening using the supplied dataset; verify current rules on the official portal."}

@router.post("/self-service/assistant-chat")
@limiter.limit("20/minute")
async def chat(request: Request, payload: AssistantChatRequest):
    data = payload.model_dump(exclude={"language"})
    if payload.language == "en":
        return await chatbot_service.chat(**data)
    if not bhashini_client.configured():
        raise HTTPException(503, "Translation is unavailable until Bhashini is configured. Select English to use the local assistant.")
    data["message"] = await bhashini_client.translate_text(payload.message, payload.language, "en")
    # Translate only the most recent user context needed for a follow-up.
    previous = next((t.get("content", "") for t in reversed(payload.history) if t.get("role") == "user"), "")
    data["history"] = []
    if previous:
        data["history"] = [{"role":"user", "content": await bhashini_client.translate_text(previous[:2000], payload.language, "en")}]
    answer = await chatbot_service.chat(**data)
    answer["reply"] = await bhashini_client.translate_text(answer["reply"], "en", payload.language)
    answer["language"] = payload.language
    return answer

