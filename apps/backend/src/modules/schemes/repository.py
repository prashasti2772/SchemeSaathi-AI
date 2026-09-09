import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.schemes.models import Scheme, SchemeVersion


async def get_scheme_by_id(db: AsyncSession, scheme_id: str | uuid.UUID) -> Scheme | None:
    result = await db.execute(select(Scheme).where(Scheme.id == scheme_id))
    return result.scalar_one_or_none()


def list_schemes_query():
    return select(Scheme).where(Scheme.is_active.is_(True)).order_by(Scheme.name)


async def create_scheme(db: AsyncSession, scheme: Scheme) -> Scheme:
    db.add(scheme)
    await db.commit()
    await db.refresh(scheme)
    return scheme


async def save_scheme(db: AsyncSession, scheme: Scheme) -> Scheme:
    await db.commit()
    await db.refresh(scheme)
    return scheme


async def get_current_version(db: AsyncSession, scheme_id: str | uuid.UUID) -> SchemeVersion | None:
    result = await db.execute(
        select(SchemeVersion).where(SchemeVersion.scheme_id == scheme_id, SchemeVersion.is_current.is_(True))
    )
    return result.scalar_one_or_none()


async def list_all_current_versions(db: AsyncSession) -> list[SchemeVersion]:
    result = await db.execute(select(SchemeVersion).where(SchemeVersion.is_current.is_(True)))
    return list(result.scalars().all())


async def create_version(db: AsyncSession, scheme_id: uuid.UUID, version: SchemeVersion) -> SchemeVersion:
    await db.execute(
        update(SchemeVersion).where(SchemeVersion.scheme_id == scheme_id, SchemeVersion.is_current.is_(True)).values(is_current=False)
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version


async def get_next_version_number(db: AsyncSession, scheme_id: uuid.UUID) -> int:
    result = await db.execute(select(SchemeVersion).where(SchemeVersion.scheme_id == scheme_id))
    versions = result.scalars().all()
    return len(versions) + 1


async def list_versions(db: AsyncSession, scheme_id: str | uuid.UUID) -> list[SchemeVersion]:
    result = await db.execute(
        select(SchemeVersion).where(SchemeVersion.scheme_id == scheme_id).order_by(SchemeVersion.version_number.desc())
    )
    return list(result.scalars().all())
