from typing import Any, Optional
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from src.modules.chatbot.service import chatbot_service
from src.modules.chatbot.schemas import AssistantChatRequest
from src.middlewares.rate_limiter import limiter

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("/chat")
@limiter.limit("20/minute")
async def chat_with_assistant(request: Request, payload: AssistantChatRequest):
    """Use the same conversational behavior as the citizen chatbot."""
    return await chatbot_service.chat(**payload.model_dump())


@router.get("/search")
async def search_schemes_semantically(q: str = Query(..., min_length=1), top_k: int = Query(5, ge=1, le=20)):
    """Performs direct semantic vector search against the 653 government schemes dataset."""
    results = await chatbot_service.search_async(query=q, top_k=top_k)
    return {
        "query": q,
        "total": len(results),
        "schemes": results,
    }
