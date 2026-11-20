from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.middlewares.error_handler import NotFoundException
from src.modules.beneficiaries.repository import get_by_id as get_beneficiary_by_id
from src.modules.matching.explainer import build_explanation
from src.modules.matching.models import MatchResult, MatchStatus
from src.modules.matching.rules_engine import build_beneficiary_profile, evaluate_eligibility
from src.modules.schemes.models import Scheme
from src.modules.schemes.repository import list_all_current_versions

MATCH_THRESHOLD = 0.5


async def run_matching_for_beneficiary(db: AsyncSession, beneficiary_id: str) -> list[MatchResult]:
    beneficiary = await get_beneficiary_by_id(db, beneficiary_id)
    if not beneficiary:
        raise NotFoundException("Beneficiary not found")

    # Re-running matching (profile updated, new scheme added) replaces the
    # previous potential matches rather than piling up duplicates.
    await db.execute(delete(MatchResult).where(MatchResult.beneficiary_id == beneficiary.id, MatchResult.status == MatchStatus.POTENTIAL))

    profile = build_beneficiary_profile(beneficiary)
    versions = await list_all_current_versions(db)
    results: list[MatchResult] = []

    for version in versions:
        scheme = (await db.execute(select(Scheme).where(Scheme.id == version.scheme_id))).scalar_one_or_none()
        if not scheme or not scheme.is_active:
            continue
        score, matched, unmatched = evaluate_eligibility(profile, version.eligibility_criteria)
        if score < MATCH_THRESHOLD:
            continue
        explanation = build_explanation(scheme.name, matched, unmatched)
        match = MatchResult(
            beneficiary_id=beneficiary.id,
            scheme_id=scheme.id,
            scheme_version_id=version.id,
            score=score,
            status=MatchStatus.POTENTIAL,
            matched_conditions=matched,
            unmatched_conditions=unmatched,
            explanation=explanation,
        )
        db.add(match)
        results.append(match)

    await db.commit()
    for match in results:
        await db.refresh(match)
    return sorted(results, key=lambda m: m.score, reverse=True)


async def list_matches_for_beneficiary(db: AsyncSession, beneficiary_id: str) -> list[MatchResult]:
    result = await db.execute(
        select(MatchResult).where(MatchResult.beneficiary_id == beneficiary_id).order_by(MatchResult.score.desc())
    )
    return list(result.scalars().all())


async def update_match_status(db: AsyncSession, match_id: str, status: MatchStatus) -> MatchResult:
    result = await db.execute(select(MatchResult).where(MatchResult.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise NotFoundException("Match result not found")
    match.status = status
    await db.commit()
    await db.refresh(match)
    return match
