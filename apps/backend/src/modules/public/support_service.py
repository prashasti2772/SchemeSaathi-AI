"""Persist support conversations and delivery outcomes without blocking ticket saves."""
import uuid
from datetime import datetime

from sqlalchemy import String, Text, select
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base, TimestampMixin, AsyncSessionLocal
from src.config.settings import settings
from src.integrations import email_client
from src.config.logging import get_logger

logger = get_logger("support_delivery")


class SupportReply(Base, TimestampMixin):
    __tablename__ = "support_replies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(String(36), index=True)
    author_id: Mapped[str] = mapped_column(String(36))
    author_role: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20))


class SupportDelivery(Base, TimestampMixin):
    __tablename__ = "support_deliveries"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(String(36), index=True)
    recipient: Mapped[str] = mapped_column(String(255))
    event: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default="queued")


class WebsiteSms(Base, TimestampMixin):
    __tablename__ = "website_sms_requests"
    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    last_requested: Mapped[datetime] = mapped_column()
    status: Mapped[str] = mapped_column(String(20), default="pending")


def queue_notifications(db, ticket_id, owner_email, event):
    """Called in the ticket transaction. No recipient addresses are returned to clients."""
    recipients = [(owner_email, event)]
    team_email = settings.SUPPORT_EMAIL
    if team_email and event in {"ticket_created", "user_followup"} and team_email.lower() != owner_email.lower():
        recipients.append((team_email, "helpdesk_alert"))
    deliveries = []
    for address, kind in recipients:
        delivery = SupportDelivery(id=str(uuid.uuid4()), ticket_id=ticket_id, recipient=address,
                                   event=kind, status="queued" if email_client.email_ready() else "unavailable")
        db.add(delivery)
        deliveries.append(delivery.id)
    return deliveries


async def deliver_notifications(delivery_ids):
    """Provider failure never rolls back a saved ticket or reply."""
    for delivery_id in delivery_ids:
        async with AsyncSessionLocal() as db:
            delivery = await db.get(SupportDelivery, delivery_id)
            if not delivery or delivery.status != "queued":
                continue
            event_text = {
                "ticket_created": "Your support request has been saved.",
                "user_followup": "Your follow-up has been saved.",
                "staff_reply": "The support team has replied to your request.",
                "helpdesk_alert": "A support request needs your attention in the helpdesk queue.",
            }[delivery.event]
            body = (f"Dear SchemeSaathi user,\n\n{event_text}\n"
                    f"Ticket reference: {delivery.ticket_id}\n\n"
                    f"Sign in to SchemeSaathi and open Support to view the conversation.\n"
                    f"{settings.PUBLIC_SITE_URL.rstrip('/')}/support\n\n"
                    "We will never ask you to send a password or OTP in a support ticket.\n\n"
                    "Regards,\nSchemeSaathi Support")
            try:
                accepted = await email_client.send_email(delivery.recipient, "SchemeSaathi support update", body)
            except Exception:
                # Do not log the provider response, email address or message body.
                logger.warning("support_notification_failed")
                accepted = False
            delivery.status = "accepted" if accepted else "failed"
            await db.commit()


async def ticket_views(db, tickets):
    if not tickets:
        return []
    ids = [ticket.id for ticket in tickets]
    replies = (await db.execute(select(SupportReply).where(SupportReply.ticket_id.in_(ids))
                               .order_by(SupportReply.created_at, SupportReply.id))).scalars().all()
    deliveries = (await db.execute(select(SupportDelivery).where(SupportDelivery.ticket_id.in_(ids))
                                  .order_by(SupportDelivery.created_at))).scalars().all()
    def utc(value):
        return value.isoformat() + "Z" if value else None
    return [{"id": ticket.id, "subject": ticket.subject, "message": ticket.message,
             "status": ticket.status, "response": ticket.response,
             "created_at": utc(ticket.created_at), "updated_at": utc(ticket.updated_at),
             "replies": [{"id": reply.id, "author_role": reply.author_role, "message": reply.message,
                           "status": reply.status, "created_at": utc(reply.created_at)}
                          for reply in replies if reply.ticket_id == ticket.id],
             "notifications": [{"event": item.event, "status": item.status, "created_at": utc(item.created_at)}
                               for item in deliveries if item.ticket_id == ticket.id and item.event != "helpdesk_alert"]}
            for ticket in tickets]
