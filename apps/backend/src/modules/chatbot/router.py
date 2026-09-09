from typing import Any, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from src.modules.chatbot.service import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


class ChatMessageRequest(BaseModel):
    message: str
    history: list[dict[str, Any]] = []
    phone_number: Optional[str] = None
    profile: Optional[dict[str, Any]] = None


@router.post("/chat")
async def chat_with_assistant(payload: ChatMessageRequest):
    """Answers user queries regarding Indian government schemes using FAISS RAG and Gemini."""
    result = await chatbot_service.chat(
        message=payload.message,
        history=payload.history,
        phone_number=payload.phone_number,
        profile=payload.profile,
    )
    return result


@router.get("/search")
async def search_schemes_semantically(q: str = Query(..., min_length=1), top_k: int = Query(5, ge=1, le=20)):
    """Performs direct semantic vector search against the 653 government schemes dataset."""
    results = await chatbot_service.search_async(query=q, top_k=top_k)
    return {
        "query": q,
        "total": len(results),
        "schemes": results,
    }
