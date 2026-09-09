from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.applications.models import ApplicationJourney, JourneyStage
from src.modules.beneficiaries.models import Beneficiary
from src.modules.facilitators.models import AssistedCase, AssistedCaseStatus
from src.modules.matching.models import MatchResult, MatchStatus
from src.modules.outreach.models import Campaign, CampaignStatus
from src.modules.readiness.models import ReadinessCheck
from src.modules.schemes.models import Scheme


async def get_funnel_analytics(db: AsyncSession):
    total_result = await db.execute(select(func.count(Beneficiary.id)))
    total = total_result.scalar_one()

    stage_counts = []
    for stage in JourneyStage:
        count_result = await db.execute(select(func.count(ApplicationJourney.id)).where(ApplicationJourney.stage == stage))
        stage_counts.append({"stage": stage.value, "count": count_result.scalar_one()})

    return {"stages": stage_counts, "total_beneficiaries": total}


async def get_geographic_gaps(db: AsyncSession):
    query = select(
        Beneficiary.location,
        func.count(Beneficiary.id).label("beneficiary_count"),
    ).group_by(Beneficiary.location)
    rows = (await db.execute(query)).all()

    results = []
    for location, beneficiary_count in rows:
        if not location:
            continue
        matched_result = await db.execute(
            select(func.count(func.distinct(MatchResult.beneficiary_id)))
            .join(Beneficiary, Beneficiary.id == MatchResult.beneficiary_id)
            .where(Beneficiary.location == location)
        )
        applied_result = await db.execute(
            select(func.count(func.distinct(ApplicationJourney.beneficiary_id)))
            .join(Beneficiary, Beneficiary.id == ApplicationJourney.beneficiary_id)
            .where(Beneficiary.location == location, ApplicationJourney.stage == JourneyStage.APPLIED)
        )
        results.append({
            "location": location,
            "beneficiary_count": beneficiary_count,
            "matched_count": matched_result.scalar_one(),
            "applied_count": applied_result.scalar_one(),
        })
    return results


async def get_scheme_analytics(db: AsyncSession):
    schemes = (await db.execute(select(Scheme).where(Scheme.is_active.is_(True)))).scalars().all()
    results = []
    for scheme in schemes:
        total_matches = (await db.execute(select(func.count(MatchResult.id)).where(MatchResult.scheme_id == scheme.id))).scalar_one()
        confirmed = (await db.execute(
            select(func.count(MatchResult.id)).where(MatchResult.scheme_id == scheme.id, MatchResult.status == MatchStatus.CONFIRMED)
        )).scalar_one()
        applications = (await db.execute(
            select(func.count(ApplicationJourney.id)).where(ApplicationJourney.scheme_id == scheme.id, ApplicationJourney.stage == JourneyStage.APPLIED)
        )).scalar_one()
        results.append({
            "scheme_id": str(scheme.id),
            "scheme_name": scheme.name,
            "total_matches": total_matches,
            "confirmed_matches": confirmed,
            "applications": applications,
        })
    return results


async def get_dashboard_summary(db: AsyncSession):
    total_beneficiaries = (await db.execute(select(func.count(Beneficiary.id)))).scalar_one()
    total_active_schemes = (await db.execute(select(func.count(Scheme.id)).where(Scheme.is_active.is_(True)))).scalar_one()
    total_potential_matches = (await db.execute(select(func.count(MatchResult.id)).where(MatchResult.status == MatchStatus.POTENTIAL))).scalar_one()
    total_confirmed_matches = (await db.execute(select(func.count(MatchResult.id)).where(MatchResult.status == MatchStatus.CONFIRMED))).scalar_one()
    total_applications_submitted = (await db.execute(
        select(func.count(ApplicationJourney.id)).where(ApplicationJourney.stage == JourneyStage.APPLIED)
    )).scalar_one()
    pending_readiness_checks = (await db.execute(select(func.count(ReadinessCheck.id)).where(ReadinessCheck.is_ready.is_(False)))).scalar_one()
    active_campaigns = (await db.execute(select(func.count(Campaign.id)).where(Campaign.status == CampaignStatus.RUNNING))).scalar_one()
    open_facilitator_cases = (await db.execute(
        select(func.count(AssistedCase.id)).where(AssistedCase.status != AssistedCaseStatus.CLOSED)
    )).scalar_one()

    return {
        "total_beneficiaries": total_beneficiaries,
        "total_active_schemes": total_active_schemes,
        "total_potential_matches": total_potential_matches,
        "total_confirmed_matches": total_confirmed_matches,
        "total_applications_submitted": total_applications_submitted,
        "pending_readiness_checks": pending_readiness_checks,
        "active_campaigns": active_campaigns,
        "open_facilitator_cases": open_facilitator_cases,
    }
