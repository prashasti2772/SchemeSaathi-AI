from sqlalchemy.ext.asyncio import AsyncSession
from src.middlewares.error_handler import NotFoundException
from src.modules.schemes import repository
from src.modules.schemes.models import Scheme, SchemeVersion
from src.modules.schemes.schemas import SchemeCreate, SchemeUpdate, SchemeVersionCreate
from src.utils.pagination import PageParams, paginate


async def create_scheme(db: AsyncSession, payload: SchemeCreate) -> Scheme:
    scheme = Scheme(**payload.model_dump())
    return await repository.create_scheme(db, scheme)


async def get_scheme(db: AsyncSession, scheme_id: str) -> Scheme:
    scheme = await repository.get_scheme_by_id(db, scheme_id)
    if not scheme:
        raise NotFoundException("Scheme not found")
    return scheme


async def list_schemes(db: AsyncSession, params: PageParams):
    return await paginate(db, repository.list_schemes_query(), params)


async def update_scheme(db: AsyncSession, scheme_id: str, payload: SchemeUpdate) -> Scheme:
    scheme = await get_scheme(db, scheme_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(scheme, field, value)
    return await repository.save_scheme(db, scheme)


async def publish_new_version(db: AsyncSession, scheme_id: str, payload: SchemeVersionCreate) -> SchemeVersion:
    scheme = await get_scheme(db, scheme_id)
    next_number = await repository.get_next_version_number(db, scheme.id)
    version = SchemeVersion(
        scheme_id=scheme.id,
        version_number=next_number,
        eligibility_criteria=[c.model_dump() for c in payload.eligibility_criteria],
        benefits=payload.benefits,
        required_documents=payload.required_documents,
        exclusions=payload.exclusions,
        application_route=payload.application_route,
        verified_by=payload.verified_by,
        verified_at=payload.verified_at,
        is_current=True,
    )
    created_version = await repository.create_version(db, scheme.id, version)
    return created_version


async def get_current_version(db: AsyncSession, scheme_id: str) -> SchemeVersion:
    version = await repository.get_current_version(db, scheme_id)
    if not version:
        raise NotFoundException("No published version exists for this scheme")
    return version


async def list_versions(db: AsyncSession, scheme_id: str) -> list[SchemeVersion]:
    await get_scheme(db, scheme_id)
    return await repository.list_versions(db, scheme_id)


async def trigger_rematch(db: AsyncSession, scheme_id: str) -> dict:
    await get_scheme(db, scheme_id)
    from src.jobs.rematching_jobs import rematch_beneficiaries_for_scheme

    rematch_beneficiaries_for_scheme.delay(scheme_id)
    return {"scheme_id": scheme_id, "status": "rematch_queued"}
