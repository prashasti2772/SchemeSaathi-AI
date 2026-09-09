from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.middlewares.error_handler import NotFoundException
from src.modules.applications.models import ApplicationJourney, JourneyStage, StatusEvent
from src.modules.applications.schemas import JourneyCreate
from src.modules.users.models import User


async def get_or_create_journey(db: AsyncSession, beneficiary_id: str, scheme_id: str) -> ApplicationJourney:
    result = await db.execute(
        select(ApplicationJourney).where(
            ApplicationJourney.beneficiary_id == beneficiary_id, ApplicationJourney.scheme_id == scheme_id
        )
    )
    journey = result.scalar_one_or_none()
    if journey:
        return journey
    journey = ApplicationJourney(beneficiary_id=beneficiary_id, scheme_id=scheme_id, stage=JourneyStage.POTENTIAL)
    db.add(journey)
    await db.commit()
    await db.refresh(journey)
    return journey


async def create_journey(db: AsyncSession, payload: JourneyCreate) -> ApplicationJourney:
    return await get_or_create_journey(db, str(payload.beneficiary_id), str(payload.scheme_id))


async def advance_journey_stage(db: AsyncSession, beneficiary_id: str, scheme_id: str, stage: JourneyStage, actor: str = "system", notes: str | None = None) -> ApplicationJourney:
    journey = await get_or_create_journey(db, beneficiary_id, scheme_id)
    journey.stage = stage
    if notes:
        journey.notes = notes
    db.add(StatusEvent(journey_id=journey.id, stage=stage, occurred_at=datetime.now(timezone.utc), actor=actor))
    await db.commit()
    await db.refresh(journey)
    return journey


async def update_stage(db: AsyncSession, journey_id: str, stage: JourneyStage, notes: str | None, current_user: User) -> ApplicationJourney:
    result = await db.execute(select(ApplicationJourney).where(ApplicationJourney.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise NotFoundException("Application journey not found")
    journey.stage = stage
    if notes:
        journey.notes = notes
    db.add(StatusEvent(journey_id=journey.id, stage=stage, occurred_at=datetime.now(timezone.utc), actor=current_user.email))
    await db.commit()
    await db.refresh(journey)
    return journey


async def get_journey(db: AsyncSession, journey_id: str) -> ApplicationJourney:
    result = await db.execute(select(ApplicationJourney).where(ApplicationJourney.id == journey_id))
    journey = result.scalar_one_or_none()
    if not journey:
        raise NotFoundException("Application journey not found")
    return journey


async def list_journey_events(db: AsyncSession, journey_id: str) -> list[StatusEvent]:
    result = await db.execute(select(StatusEvent).where(StatusEvent.journey_id == journey_id).order_by(StatusEvent.occurred_at))
    return list(result.scalars().all())


async def list_journeys_for_beneficiary(db: AsyncSession, beneficiary_id: str) -> list[ApplicationJourney]:
    result = await db.execute(select(ApplicationJourney).where(ApplicationJourney.beneficiary_id == beneficiary_id))
    return list(result.scalars().all())
