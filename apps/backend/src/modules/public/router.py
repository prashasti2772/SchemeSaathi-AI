from typing import Any
import asyncio
from fastapi import APIRouter, HTTPException, Request
from src.modules.chatbot.schemas import AssistantChatRequest
from src.modules.chatbot.service import chatbot_service
from src.modules.eligibility.service import eligibility_service
from src.middlewares.rate_limiter import limiter

router = APIRouter(prefix="/public", tags=["Public"])
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
    return await chatbot_service.chat(**payload.model_dump())
