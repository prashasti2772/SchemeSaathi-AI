from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.beneficiaries.models import Beneficiary, ConsentType
from src.modules.beneficiaries.repository import has_consent
from src.modules.matching.rules_engine import build_beneficiary_profile, evaluate_eligibility
from src.modules.schemes.repository import get_current_version

MIN_AUDIENCE_SCORE = 0.4


async def select_audience_for_scheme(db: AsyncSession, scheme_id: str) -> list[tuple[Beneficiary, str]]:
    version = await get_current_version(db, scheme_id)
    beneficiaries = (await db.execute(select(Beneficiary).where(Beneficiary.is_active.is_(True)))).scalars().all()

    selected: list[tuple[Beneficiary, str]] = []
    for beneficiary in beneficiaries:
        consented = await has_consent(db, beneficiary.id, ConsentType.OUTREACH_CONTACT)
        if not consented:
            continue
        profile = build_beneficiary_profile(beneficiary)
        score, matched, _ = evaluate_eligibility(profile, version.eligibility_criteria)
        if score >= MIN_AUDIENCE_SCORE:
            reason = f"Matched {len(matched)} of {len(version.eligibility_criteria)} eligibility conditions (score {score})"
            selected.append((beneficiary, reason))
    return selected
