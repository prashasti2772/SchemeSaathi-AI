from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.readiness.models import ReadinessCheck
from src.modules.readiness.schemas import ReadinessCheckRequest
from src.modules.schemes.service import get_current_version


async def run_readiness_check(db: AsyncSession, payload: ReadinessCheckRequest) -> ReadinessCheck:
    version = await get_current_version(db, str(payload.scheme_id))
    required = set(version.required_documents or [])
    submitted = set(payload.submitted_documents)
    missing = sorted(required - submitted)

    check = ReadinessCheck(
        beneficiary_id=payload.beneficiary_id,
        scheme_id=payload.scheme_id,
        required_documents=sorted(required),
        missing_documents=missing,
        is_ready=len(missing) == 0,
    )
    db.add(check)
    await db.commit()
    await db.refresh(check)

    if check.is_ready:
        from src.modules.applications.service import advance_journey_stage
        from src.modules.applications.models import JourneyStage

        await advance_journey_stage(db, str(payload.beneficiary_id), str(payload.scheme_id), JourneyStage.READY)

    return check


async def list_checks_for_beneficiary(db: AsyncSession, beneficiary_id: str) -> list[ReadinessCheck]:
    result = await db.execute(select(ReadinessCheck).where(ReadinessCheck.beneficiary_id == beneficiary_id))
    return list(result.scalars().all())
