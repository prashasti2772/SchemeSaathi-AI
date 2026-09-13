from typing import Any, Optional
from fastapi import APIRouter, Query, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.modules.eligibility import localization
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
async def search_schemes_semantically(q: str = Query(..., min_length=1, max_length=200), top_k: int = Query(5, ge=1, le=20), language: localization.Language = "en", db: AsyncSession = Depends(get_db)):
    """Performs direct semantic vector search against the 653 government schemes dataset."""
    query, query_status = await localization.search_query(q, language)
    results = await chatbot_service.search_async(query=query, top_k=top_k)
    results = await localization.localize_records(db, results, language)
    return {
        "query": q, "search_translation_status": query_status,
        "total": len(results),
        "schemes": results,
    }
