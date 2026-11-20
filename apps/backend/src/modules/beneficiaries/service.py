import csv
import io
from sqlalchemy.ext.asyncio import AsyncSession
from src.middlewares.error_handler import BusinessRuleException, ConflictException, NotFoundException
from src.modules.beneficiaries import repository
from src.modules.beneficiaries.models import Beneficiary, ConsentType
from src.modules.beneficiaries.schemas import BeneficiaryCreate, BeneficiaryUpdate, BulkImportResponse, BulkImportRowError, ConsentGrantRequest
from src.utils.formatters import normalize_phone_number
from src.utils.pagination import PageParams, paginate

REQUIRED_CSV_COLUMNS = {"phone_number"}
OPTIONAL_CSV_COLUMNS = {"full_name", "location", "occupation", "business_type", "income_band", "social_category", "preferred_language"}


async def create_beneficiary(db: AsyncSession, payload: BeneficiaryCreate) -> Beneficiary:
    normalized_phone = normalize_phone_number(payload.phone_number)
    existing = await repository.get_by_phone(db, normalized_phone)
    if existing:
        raise ConflictException("A beneficiary with this phone number already exists")
    beneficiary = Beneficiary(**{**payload.model_dump(), "phone_number": normalized_phone})
    return await repository.create(db, beneficiary)


async def get_beneficiary(db: AsyncSession, beneficiary_id: str) -> Beneficiary:
    beneficiary = await repository.get_by_id(db, beneficiary_id)
    if not beneficiary:
        raise NotFoundException("Beneficiary not found")
    return beneficiary


async def list_beneficiaries(db: AsyncSession, params: PageParams):
    items, total = await paginate(db, repository.base_query(), params)
    return items, total


async def update_beneficiary(db: AsyncSession, beneficiary_id: str, payload: BeneficiaryUpdate) -> Beneficiary:
    beneficiary = await get_beneficiary(db, beneficiary_id)
    update_data = payload.model_dump(exclude_unset=True)
    sensitive_fields = {"occupation", "business_type", "income_band", "social_category", "profile_attributes"}
    if sensitive_fields.intersection(update_data.keys()):
        has_consent = await repository.has_consent(db, beneficiary.id, ConsentType.PROFILE_COLLECTION)
        if not has_consent:
            raise BusinessRuleException("Profile collection consent must be recorded before storing sensitive profile data")
    for field, value in update_data.items():
        setattr(beneficiary, field, value)
    return await repository.save(db, beneficiary)


async def grant_or_revoke_consent(db: AsyncSession, beneficiary_id: str, payload: ConsentGrantRequest):
    beneficiary = await get_beneficiary(db, beneficiary_id)
    return await repository.record_consent(db, beneficiary.id, payload.consent_type, payload.granted, payload.source_channel)


async def bulk_import_from_csv(db: AsyncSession, file_bytes: bytes) -> BulkImportResponse:
    text_stream = io.StringIO(file_bytes.decode("utf-8-sig"))
    reader = csv.DictReader(text_stream)

    if not REQUIRED_CSV_COLUMNS.issubset(set(reader.fieldnames or [])):
        raise BusinessRuleException(f"CSV must include these columns: {', '.join(REQUIRED_CSV_COLUMNS)}")

    total_rows, created_count, skipped_count = 0, 0, 0
    errors: list[BulkImportRowError] = []
    phones_seen_in_file: set[str] = set()

    for row_number, row in enumerate(reader, start=2):
        total_rows += 1
        raw_phone = (row.get("phone_number") or "").strip()
        digits_only = "".join(ch for ch in raw_phone if ch.isdigit())
        if not raw_phone or len(digits_only) < 10:
            errors.append(BulkImportRowError(row_number=row_number, phone_number=raw_phone or None, error="phone_number is missing or invalid"))
            skipped_count += 1
            continue

        normalized_phone = normalize_phone_number(raw_phone)

        if normalized_phone in phones_seen_in_file:
            errors.append(BulkImportRowError(row_number=row_number, phone_number=normalized_phone, error="Duplicate phone number within this file"))
            skipped_count += 1
            continue

        existing = await repository.get_by_phone(db, normalized_phone)
        if existing:
            errors.append(BulkImportRowError(row_number=row_number, phone_number=normalized_phone, error="Beneficiary already exists"))
            skipped_count += 1
            continue

        phones_seen_in_file.add(normalized_phone)

        beneficiary = Beneficiary(
            phone_number=normalized_phone,
            full_name=row.get("full_name") or None,
            location=row.get("location") or None,
            occupation=row.get("occupation") or None,
            business_type=row.get("business_type") or None,
            income_band=row.get("income_band") or None,
            social_category=row.get("social_category") or None,
            preferred_language=row.get("preferred_language") or "hi",
        )
        db.add(beneficiary)
        created_count += 1

    await db.commit()
    return BulkImportResponse(total_rows=total_rows, created_count=created_count, skipped_count=skipped_count, errors=errors)
