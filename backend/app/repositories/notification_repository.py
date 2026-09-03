"""Notification repository — data access layer."""

from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def get_by_id(self, notification_id: str) -> Optional[Notification]:
        result = await self.db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: str, limit: int = 50) -> List[Notification]:
        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_unread_count(self, user_id: str) -> int:
        from sqlalchemy import or_
        result = await self.db.execute(
            select(Notification)
            .where(
                Notification.user_id == user_id,
                or_(Notification.is_read.is_(False), Notification.is_read == False, Notification.is_read.is_(None))
            )
        )
        return len(list(result.scalars().all()))

    async def mark_read(self, notification_id: str) -> Optional[Notification]:
        notif = await self.get_by_id(notification_id)
        if notif:
            notif.is_read = True
            await self.db.flush()
        return notif

    async def mark_all_read(self, user_id: str) -> int:
        result = await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id)
            .values(is_read=True)
        )
        await self.db.flush()
        return result.rowcount

    async def delete(self, notification_id: str, user_id: str) -> bool:
        from sqlalchemy import delete
        result = await self.db.execute(
            delete(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def clear_all(self, user_id: str) -> int:
        from sqlalchemy import delete
        result = await self.db.execute(
            delete(Notification).where(Notification.user_id == user_id)
        )
        await self.db.flush()
        return result.rowcount
