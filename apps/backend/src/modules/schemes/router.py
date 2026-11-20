from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rbac_middleware import require_admin, require_any_staff
from src.modules.schemes import service
from src.modules.schemes.schemas import SchemeCreate, SchemeOut, SchemeUpdate, SchemeVersionCreate, SchemeVersionOut
from src.utils.pagination import PageParams, PageResponse

router = APIRouter(prefix="/schemes", tags=["Schemes"], dependencies=[Depends(require_any_staff)])


@router.post("", response_model=SchemeOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_scheme(payload: SchemeCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_scheme(db, payload)


@router.get("", response_model=PageResponse[SchemeOut])
async def list_schemes(params: PageParams = Depends(), db: AsyncSession = Depends(get_db)):
    items, total = await service.list_schemes(db, params)
    total_pages = (total + params.page_size - 1) // params.page_size
    return PageResponse(items=items, total=total, page=params.page, page_size=params.page_size, total_pages=total_pages)


@router.get("/{scheme_id}", response_model=SchemeOut)
async def get_scheme(scheme_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_scheme(db, scheme_id)


@router.patch("/{scheme_id}", response_model=SchemeOut, dependencies=[Depends(require_admin)])
async def update_scheme(scheme_id: str, payload: SchemeUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_scheme(db, scheme_id, payload)


@router.post("/{scheme_id}/versions", response_model=SchemeVersionOut, status_code=201, dependencies=[Depends(require_admin)])
async def publish_new_version(scheme_id: str, payload: SchemeVersionCreate, db: AsyncSession = Depends(get_db)):
    return await service.publish_new_version(db, scheme_id, payload)


@router.get("/{scheme_id}/versions/current", response_model=SchemeVersionOut)
async def get_current_version(scheme_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_current_version(db, scheme_id)


@router.get("/{scheme_id}/versions", response_model=list[SchemeVersionOut])
async def list_versions(scheme_id: str, db: AsyncSession = Depends(get_db)):
    return await service.list_versions(db, scheme_id)


@router.post("/{scheme_id}/rematch", dependencies=[Depends(require_admin)])
async def trigger_rematch(scheme_id: str, db: AsyncSession = Depends(get_db)):
    return await service.trigger_rematch(db, scheme_id)
