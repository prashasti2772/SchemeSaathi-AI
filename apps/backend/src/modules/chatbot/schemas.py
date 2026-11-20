from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class AssistantChatRequest(BaseModel):
    language: Literal["en", "hi", "mr", "gu", "ta", "te", "bn", "kn"] = "en"
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)
    phone_number: str | None = None
    profile: dict[str, Any] | None = None

    @field_validator("message")
    @classmethod
    def require_text(cls, value):
        if not value.strip():
            raise ValueError("Please enter a question")
        return value.strip()
