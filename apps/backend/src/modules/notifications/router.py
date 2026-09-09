from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rbac_middleware import require_operator
from src.modules.notifications import service
from src.modules.notifications.schemas import NotificationLogOut, NotificationSendRequest

router = APIRouter(prefix="/notifications", tags=["Notifications"], dependencies=[Depends(require_operator)])


@router.post("/send", response_model=NotificationLogOut, status_code=201)
async def send_notification(payload: NotificationSendRequest, db: AsyncSession = Depends(get_db)):
    return await service.queue_notification(db, payload)


@router.get("/beneficiary/{beneficiary_id}", response_model=list[NotificationLogOut])
async def list_logs(beneficiary_id: str, db: AsyncSession = Depends(get_db)):
    return await service.list_logs_for_beneficiary(db, beneficiary_id)
