"""Trip Group Repository — Data access for organizer trip groups, members, and messages."""

from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trip_group import TripGroup, TripGroupMember, TripGroupMessage, GroupMemberRole
from app.models.package import Package
from app.models.booking import Booking, BookingStatus
from app.models.user import User


class TripGroupRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_group(self, package_id: str, organizer_id: str, title: str) -> TripGroup:
        """Fetch existing trip group for package or instantiate a new one."""
        result = await self.db.execute(
            select(TripGroup)
            .options(
                selectinload(TripGroup.members).selectinload(TripGroupMember.user),
                selectinload(TripGroup.package),
                selectinload(TripGroup.organizer),
            )
            .where(TripGroup.package_id == package_id)
        )
        group = result.scalar_one_or_none()
        if not group:
            group = TripGroup(
                package_id=package_id,
                organizer_id=organizer_id,
                title=title,
            )
            self.db.add(group)
            await self.db.flush()
        return group

    async def get_by_package_id(self, package_id: str) -> Optional[TripGroup]:
        result = await self.db.execute(
            select(TripGroup)
            .options(
                selectinload(TripGroup.members).selectinload(TripGroupMember.user),
                selectinload(TripGroup.package),
                selectinload(TripGroup.organizer),
            )
            .where(TripGroup.package_id == package_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, group_id: str) -> Optional[TripGroup]:
        result = await self.db.execute(
            select(TripGroup)
            .options(
                selectinload(TripGroup.members).selectinload(TripGroupMember.user),
                selectinload(TripGroup.package),
                selectinload(TripGroup.organizer),
            )
            .where(TripGroup.id == group_id)
        )
        return result.scalar_one_or_none()

    async def is_member(self, group_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(TripGroupMember).where(
                and_(TripGroupMember.group_id == group_id, TripGroupMember.user_id == user_id)
            )
        )
        return result.scalar_one_or_none() is not None

    async def add_member(self, group_id: str, user_id: str, role: GroupMemberRole = GroupMemberRole.TRAVELER) -> TripGroupMember:
        existing = await self.db.execute(
            select(TripGroupMember).where(
                and_(TripGroupMember.group_id == group_id, TripGroupMember.user_id == user_id)
            )
        )
        member = existing.scalar_one_or_none()
        if not member:
            member = TripGroupMember(
                group_id=group_id,
                user_id=user_id,
                role=role,
            )
            self.db.add(member)
            await self.db.flush()
        return member

    async def create_message(
        self,
        group_id: str,
        sender_id: str,
        sender_name: str,
        sender_role: str,
        message: str,
    ) -> TripGroupMessage:
        msg = TripGroupMessage(
            group_id=group_id,
            sender_id=sender_id,
            sender_name=sender_name,
            sender_role=sender_role,
            message=message,
        )
        self.db.add(msg)
        await self.db.flush()
        return msg

    async def list_messages(self, group_id: str, limit: int = 100) -> List[TripGroupMessage]:
        result = await self.db.execute(
            select(TripGroupMessage)
            .options(selectinload(TripGroupMessage.sender))
            .where(TripGroupMessage.group_id == group_id)
            .order_by(TripGroupMessage.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_confirmed_travelers(self, package_id: str) -> int:
        """Count total confirmed travelers from confirmed bookings for this package."""
        result = await self.db.execute(
            select(func.sum(Booking.travelers)).where(
                and_(
                    Booking.package_id == package_id,
                    Booking.status == BookingStatus.CONFIRMED,
                )
            )
        )
        total = result.scalar()
        return int(total) if total else 0

    async def list_groups_by_organizer(self, organizer_id: str) -> List[TripGroup]:
        result = await self.db.execute(
            select(TripGroup)
            .options(
                selectinload(TripGroup.package),
                selectinload(TripGroup.members),
                selectinload(TripGroup.messages),
            )
            .where(TripGroup.organizer_id == organizer_id)
            .order_by(TripGroup.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_groups_by_user(self, user_id: str) -> List[TripGroup]:
        result = await self.db.execute(
            select(TripGroup)
            .join(TripGroupMember, TripGroup.id == TripGroupMember.group_id)
            .options(
                selectinload(TripGroup.package),
                selectinload(TripGroup.organizer),
                selectinload(TripGroup.members),
                selectinload(TripGroup.messages),
            )
            .where(TripGroupMember.user_id == user_id)
            .order_by(TripGroup.created_at.desc())
        )
        return list(result.scalars().all())
