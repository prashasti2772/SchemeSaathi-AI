"""Account-owned questionnaire answers; independent of authentication and matching."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import ForeignKey, JSON, cast, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from src.config.database import Base, TimestampMixin, get_db
from src.middlewares.auth_middleware import get_current_user
from src.modules.users.models import User

router = APIRouter()


class SchemeProfile(Base, TimestampMixin):
    __tablename__ = "citizen_scheme_profiles"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    personal: Mapped[dict] = mapped_column(JSON, default=dict)
    business: Mapped[dict] = mapped_column(JSON, default=dict)
    other: Mapped[dict] = mapped_column(JSON, default=dict)


FIELDS = {
    "personal": {"fullName", "phoneNumber", "age", "gender", "category", "state", "district", "disability", "residence",
                 "education", "occupation", "interests", "welfareNeeds", "entrepreneurshipSupport"},
    "business": {"businessType", "businessActivity", "businessStage", "yearsInBusiness", "annualTurnover", "numberOfEmployees"},
    "other": {"annualIncome", "registeredBusiness", "fundingRequired", "preferredSupport", "previousScheme", "interestedSchemeType"},
}


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    personal: dict[str, str | None] | None = Field(default=None, max_length=14)
    business: dict[str, str | None] | None = Field(default=None, max_length=6)
    other: dict[str, str | None] | None = Field(default=None, max_length=6)

    @model_validator(mode="after")
    def bounded_answers(self):
        changes = self.model_dump(exclude_none=True)
        if not changes:
            raise ValueError("Provide a questionnaire section")
        for section, answers in changes.items():
            if set(answers) - FIELDS[section]:
                raise ValueError("Unknown questionnaire field")
            if any(value is not None and len(value) > 500 for value in answers.values()):
                raise ValueError("Questionnaire answers must be at most 500 characters")
        return self


def merge_answers(column, answers, dialect):
    """Merge a PATCH in the database so partial/concurrent edits retain other answers."""
    if dialect == "postgresql":
        return cast(cast(column, JSONB).op("||")(cast(answers, JSONB)), JSON)
    if not answers:
        return column
    arguments = [column]
    for field, value in answers.items():
        arguments.extend(["$." + field, value])
    return func.json_set(*arguments)


def profile_view(row):
    return {"exists": row is not None, **{key: getattr(row, key) if row else {} for key in FIELDS}}


@router.get("/scheme-profile")
async def read_profile(response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return profile_view(await db.get(SchemeProfile, user.id))


@router.patch("/scheme-profile")
async def save_profile(payload: ProfileUpdate, response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    if db.bind.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:
        from sqlalchemy.dialects.sqlite import insert
    changes = payload.model_dump(exclude_none=True)
    # Merge submitted fields atomically, preserving legacy and concurrent answers.
    user_id = user.id
    statement = insert(SchemeProfile).values(user_id=user_id, **changes)
    merged = {section: merge_answers(getattr(SchemeProfile, section), answers, db.bind.dialect.name)
              for section, answers in changes.items()}
    await db.execute(statement.on_conflict_do_update(index_elements=[SchemeProfile.user_id],
        set_={**merged, "updated_at": datetime.utcnow()}))
    await db.commit()
    return profile_view(await db.get(SchemeProfile, user_id, populate_existing=True))
