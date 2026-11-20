import asyncio
from src.config.database import AsyncSessionLocal
from src.config.logging import get_logger
from src.jobs.celery_app import celery_app

logger = get_logger("rematching_jobs")


@celery_app.task(name="matching.rematch_for_scheme", bind=True, max_retries=3, default_retry_delay=30)
def rematch_beneficiaries_for_scheme(self, scheme_id: str) -> None:
    try:
        asyncio.run(_rematch_beneficiaries_for_scheme(scheme_id))
    except Exception as exc:
        logger.error("rematch_failed", scheme_id=scheme_id, error=str(exc))
        raise self.retry(exc=exc)


async def _rematch_beneficiaries_for_scheme(scheme_id: str) -> None:
    from sqlalchemy import select
    from src.modules.beneficiaries.models import Beneficiary
    from src.modules.matching.service import run_matching_for_beneficiary

    async with AsyncSessionLocal() as db:
        beneficiaries = (await db.execute(select(Beneficiary).where(Beneficiary.is_active.is_(True)))).scalars().all()
        for beneficiary in beneficiaries:
            await run_matching_for_beneficiary(db, str(beneficiary.id))
        logger.info("rematch_completed", scheme_id=scheme_id, beneficiaries_checked=len(beneficiaries))
