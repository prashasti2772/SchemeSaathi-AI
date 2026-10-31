"""Account-owned bookmarks referencing the versioned public catalogue by stable ID."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from sqlalchemy import ForeignKey, String, delete, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from src.config.database import Base, TimestampMixin, get_db
from src.middlewares.auth_middleware import get_current_user
from src.modules.users.models import User

router = APIRouter()


class SavedScheme(Base, TimestampMixin):
    __tablename__ = "citizen_saved_schemes"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    scheme_id: Mapped[str] = mapped_column(String(100), primary_key=True)


def scheme_view(scheme_id):
    from src.modules.eligibility.service import eligibility_service
    return eligibility_service.get_scheme(scheme_id)


@router.get("/saved-schemes")
async def list_saved(response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    ids = (await db.execute(select(SavedScheme.scheme_id).where(SavedScheme.user_id == user.id)
                           .order_by(SavedScheme.created_at.desc(), SavedScheme.scheme_id))).scalars().all()
    # Keep bookmarks when a catalogue record is withdrawn, but never present its
    # old eligibility rules or application link as a currently verified scheme.
    schemes = [scheme_view(scheme_id) or {"scheme_id": scheme_id, "id": scheme_id,
                "name": "Scheme awaiting review", "available": False} for scheme_id in ids]
    return {"schemes": schemes}


@router.put("/saved-schemes/{scheme_id}")
async def save_scheme(response: Response, scheme_id: str = Path(min_length=1, max_length=100),
                      user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    scheme = scheme_view(scheme_id)
    if scheme is None:
        raise HTTPException(404, "Scheme not found in the verified catalogue")
    if db.bind.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:
        from sqlalchemy.dialects.sqlite import insert
    await db.execute(insert(SavedScheme).values(user_id=user.id, scheme_id=scheme_id)
                     .on_conflict_do_nothing(index_elements=[SavedScheme.user_id, SavedScheme.scheme_id]))
    await db.commit()
    return {"saved": True, "scheme": scheme}


@router.delete("/saved-schemes/{scheme_id}", status_code=204)
async def remove_scheme(scheme_id: str = Path(min_length=1, max_length=100),
                        user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(SavedScheme).where(SavedScheme.user_id == user.id, SavedScheme.scheme_id == scheme_id))
    await db.commit()
