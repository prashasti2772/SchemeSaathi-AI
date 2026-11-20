from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.error_handler import BusinessRuleException
from src.middlewares.rbac_middleware import require_any_staff, require_operator
from src.modules.beneficiaries import service
from src.modules.beneficiaries.schemas import BeneficiaryCreate, BeneficiaryOut, BeneficiaryUpdate, BulkImportResponse, ConsentGrantRequest, ConsentOut
from src.utils.pagination import PageParams, PageResponse

router = APIRouter(prefix="/beneficiaries", tags=["Beneficiaries"], dependencies=[Depends(require_any_staff)])


@router.post("", response_model=BeneficiaryOut, status_code=201)
async def create_beneficiary(payload: BeneficiaryCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_beneficiary(db, payload)


@router.post("/bulk-import", response_model=BulkImportResponse, dependencies=[Depends(require_operator)])
async def bulk_import_beneficiaries(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename.lower().endswith(".csv"):
        raise BusinessRuleException("Only .csv files are supported for bulk import")
    file_bytes = await file.read()
    return await service.bulk_import_from_csv(db, file_bytes)


@router.get("", response_model=PageResponse[BeneficiaryOut])
async def list_beneficiaries(params: PageParams = Depends(), db: AsyncSession = Depends(get_db)):
    items, total = await service.list_beneficiaries(db, params)
    total_pages = (total + params.page_size - 1) // params.page_size
    return PageResponse(items=items, total=total, page=params.page, page_size=params.page_size, total_pages=total_pages)


@router.get("/{beneficiary_id}", response_model=BeneficiaryOut)
async def get_beneficiary(beneficiary_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_beneficiary(db, beneficiary_id)


@router.patch("/{beneficiary_id}", response_model=BeneficiaryOut, dependencies=[Depends(require_operator)])
async def update_beneficiary(beneficiary_id: str, payload: BeneficiaryUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_beneficiary(db, beneficiary_id, payload)


@router.post("/{beneficiary_id}/consent", response_model=ConsentOut, status_code=201)
async def record_consent(beneficiary_id: str, payload: ConsentGrantRequest, db: AsyncSession = Depends(get_db)):
    return await service.grant_or_revoke_consent(db, beneficiary_id, payload)
