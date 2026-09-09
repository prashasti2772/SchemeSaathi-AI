from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.middlewares.error_handler import ConflictException, ForbiddenException, NotFoundException
from src.modules.facilitators.models import AssistedCase, AssistedCaseStatus, Facilitator
from src.modules.facilitators.schemas import AssistedCaseCreate, FacilitatorCreate
from src.modules.users.models import User


async def create_facilitator(db: AsyncSession, payload: FacilitatorCreate) -> Facilitator:
    result = await db.execute(select(Facilitator).where(Facilitator.user_id == payload.user_id))
    if result.scalar_one_or_none():
        raise ConflictException("This user is already registered as a facilitator")
    facilitator = Facilitator(**payload.model_dump())
    db.add(facilitator)
    await db.commit()
    await db.refresh(facilitator)
    return facilitator


async def get_facilitator_for_user(db: AsyncSession, user_id: str) -> Facilitator:
    result = await db.execute(select(Facilitator).where(Facilitator.user_id == user_id))
    facilitator = result.scalar_one_or_none()
    if not facilitator or not facilitator.is_active:
        raise NotFoundException("No active facilitator profile found for this user")
    return facilitator


async def open_assisted_case(db: AsyncSession, payload: AssistedCaseCreate, current_user: User) -> AssistedCase:
    facilitator = await get_facilitator_for_user(db, str(current_user.id))
    case = AssistedCase(
        facilitator_id=facilitator.id,
        beneficiary_id=payload.beneficiary_id,
        status=AssistedCaseStatus.OPEN,
        opened_at=datetime.now(timezone.utc),
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


async def update_case_status(db: AsyncSession, case_id: str, status: AssistedCaseStatus, current_user: User) -> AssistedCase:
    result = await db.execute(select(AssistedCase).where(AssistedCase.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise NotFoundException("Assisted case not found")

    facilitator = await get_facilitator_for_user(db, str(current_user.id))
    if case.facilitator_id != facilitator.id and current_user.role.value != "admin":
        raise ForbiddenException("You are not authorized to update this case")

    case.status = status
    if status == AssistedCaseStatus.CLOSED:
        case.closed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(case)
    return case


async def list_cases_for_facilitator(db: AsyncSession, current_user: User) -> list[AssistedCase]:
    facilitator = await get_facilitator_for_user(db, str(current_user.id))
    result = await db.execute(select(AssistedCase).where(AssistedCase.facilitator_id == facilitator.id))
    return list(result.scalars().all())
