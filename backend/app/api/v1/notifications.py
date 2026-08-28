"""Notifications API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.database import get_db
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.repositories.notification_repository import NotificationRepository
from app.core.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _format_notification(n) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        user_id=n.user_id,
        type=n.type.value if hasattr(n.type, 'value') else n.type,
        title=n.title,
        message=n.message,
        related_booking_id=n.related_booking_id,
        related_trip_id=n.related_trip_id,
        is_read=n.is_read,
        created_at=n.created_at.isoformat() if n.created_at else "",
    )


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's notifications, most recent first."""
    repo = NotificationRepository(db)
    notifications = await repo.get_by_user(current_user.id)
    return [_format_notification(n) for n in notifications]


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the count of unread notifications."""
    repo = NotificationRepository(db)
    count = await repo.get_unread_count(current_user.id)
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read. Ownership enforced."""
    repo = NotificationRepository(db)
    notif = await repo.get_by_id(notification_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    if notif.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    await repo.mark_read(notification_id)
    await db.commit()
    return _format_notification(notif)


@router.patch("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all of the current user's notifications as read."""
    repo = NotificationRepository(db)
    count = await repo.mark_all_read(current_user.id)
    await db.commit()
    return {"marked_read": count}
