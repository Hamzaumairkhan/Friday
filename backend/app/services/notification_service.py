"""Notification service — creates notifications for booking lifecycle events."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType
from app.repositories.notification_repository import NotificationRepository
from app.core.logging import get_logger

logger = get_logger("services.notification")


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)

    async def notify_new_booking(
        self, organizer_user_id: str, booking_id: str, traveler_name: str, package_title: str
    ) -> Notification:
        """Notify organizer about a new booking request."""
        return await self.repo.create(Notification(
            user_id=organizer_user_id,
            type=NotificationType.NEW_BOOKING,
            title="New Booking Request",
            message=f"{traveler_name} has booked '{package_title}'.",
            related_booking_id=booking_id,
        ))

    async def notify_payment_uploaded(
        self, organizer_user_id: str, booking_id: str, traveler_name: str
    ) -> Notification:
        """Notify organizer that a traveler has uploaded payment proof."""
        return await self.repo.create(Notification(
            user_id=organizer_user_id,
            type=NotificationType.PAYMENT_UPLOADED,
            title="Payment Proof Uploaded",
            message=f"{traveler_name} has submitted payment proof for booking #{booking_id[:8]}.",
            related_booking_id=booking_id,
        ))

    async def notify_payment_verified(
        self, traveler_user_id: str, booking_id: str, package_title: str
    ) -> Notification:
        """Notify traveler that payment has been verified."""
        return await self.repo.create(Notification(
            user_id=traveler_user_id,
            type=NotificationType.PAYMENT_VERIFIED,
            title="Payment Verified ✓",
            message=f"Your payment for '{package_title}' has been verified. Booking confirmed!",
            related_booking_id=booking_id,
        ))

    async def notify_payment_rejected(
        self, traveler_user_id: str, booking_id: str, package_title: str, reason: str = ""
    ) -> Notification:
        """Notify traveler that payment has been rejected."""
        msg = f"Your payment for '{package_title}' was rejected."
        if reason:
            msg += f" Reason: {reason}"
        return await self.repo.create(Notification(
            user_id=traveler_user_id,
            type=NotificationType.PAYMENT_REJECTED,
            title="Payment Rejected",
            message=msg,
            related_booking_id=booking_id,
        ))

    async def notify_booking_confirmed(
        self, traveler_user_id: str, booking_id: str, package_title: str
    ) -> Notification:
        """Notify traveler that booking has been confirmed."""
        return await self.repo.create(Notification(
            user_id=traveler_user_id,
            type=NotificationType.BOOKING_CONFIRMED,
            title="Booking Confirmed!",
            message=f"Your booking for '{package_title}' is confirmed. Get ready for your trip!",
            related_booking_id=booking_id,
        ))

    async def notify_booking_rejected(
        self, traveler_user_id: str, booking_id: str, package_title: str
    ) -> Notification:
        """Notify traveler that booking has been rejected."""
        return await self.repo.create(Notification(
            user_id=traveler_user_id,
            type=NotificationType.BOOKING_REJECTED,
            title="Booking Rejected",
            message=f"Your booking for '{package_title}' has been rejected by the organizer.",
            related_booking_id=booking_id,
        ))

    async def notify_new_group_message(
        self,
        recipient_user_id: str,
        package_id: str,
        sender_name: str,
        group_title: str,
        message_text: str,
    ) -> Notification:
        """Notify recipient of a new chat message in their trip group."""
        snippet = (message_text[:60] + "...") if len(message_text) > 60 else message_text
        return await self.repo.create(Notification(
            user_id=recipient_user_id,
            type=NotificationType.NEW_GROUP_MESSAGE,
            title=f"💬 {sender_name} ({group_title})",
            message=f"{sender_name}: \"{snippet}\"",
            related_trip_id=package_id,
        ))
