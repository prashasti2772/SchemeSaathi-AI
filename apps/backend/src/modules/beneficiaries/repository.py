import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.beneficiaries.models import Beneficiary, ConsentRecord, ConsentType


async def get_by_id(db: AsyncSession, beneficiary_id: str | uuid.UUID) -> Beneficiary | None:
    result = await db.execute(select(Beneficiary).where(Beneficiary.id == beneficiary_id))
    return result.scalar_one_or_none()


async def get_by_phone(db: AsyncSession, phone_number: str) -> Beneficiary | None:
    result = await db.execute(select(Beneficiary).where(Beneficiary.phone_number == phone_number))
    return result.scalar_one_or_none()


def base_query():
    return select(Beneficiary).order_by(Beneficiary.created_at.desc())


async def create(db: AsyncSession, beneficiary: Beneficiary) -> Beneficiary:
    db.add(beneficiary)
    await db.commit()
    await db.refresh(beneficiary)
    return beneficiary


async def save(db: AsyncSession, beneficiary: Beneficiary) -> Beneficiary:
    await db.commit()
    await db.refresh(beneficiary)
    return beneficiary


async def has_consent(db: AsyncSession, beneficiary_id: uuid.UUID, consent_type: ConsentType) -> bool:
    result = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.beneficiary_id == beneficiary_id,
            ConsentRecord.consent_type == consent_type,
            ConsentRecord.granted.is_(True),
        )
    )
    return result.scalar_one_or_none() is not None


async def record_consent(db: AsyncSession, beneficiary_id: uuid.UUID, consent_type: ConsentType, granted: bool, source_channel: str) -> ConsentRecord:
    record = ConsentRecord(
        beneficiary_id=beneficiary_id,
        consent_type=consent_type,
        granted=granted,
        granted_at=datetime.now(timezone.utc) if granted else None,
        source_channel=source_channel,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
