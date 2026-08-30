"""Trip Group Service — Business logic, membership verification, and message routing."""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.trip_group import TripGroup, TripGroupMember, TripGroupMessage, GroupMemberRole
from app.models.package import Package
from app.models.organizer import Organizer
from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.models.notification import Notification, NotificationType
from app.repositories.trip_group_repository import TripGroupRepository
from app.repositories.package_repository import PackageRepository
from app.repositories.organizer_repository import OrganizerRepository
from app.repositories.notification_repository import NotificationRepository
from app.core.exceptions import NotFoundError, AuthorizationError, ValidationError
from app.core.logging import get_logger

logger = get_logger("services.trip_group")


class TripGroupService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TripGroupRepository(db)
        self.package_repo = PackageRepository(db)
        self.organizer_repo = OrganizerRepository(db)
        self.notification_repo = NotificationRepository(db)

    async def get_or_create_for_package(self, package_id: str) -> TripGroup:
        # Check if package_id is a group ID or package ID
        pkg = await self.package_repo.get_by_id(package_id)
        if not pkg:
            # Check if it's already a group ID
            existing_group = await self.repo.get_by_id(package_id)
            if existing_group:
                return existing_group
            raise NotFoundError(f"Package or group '{package_id}' not found")

        org = await self.organizer_repo.get_by_id(pkg.organizer_id)
        org_name = (getattr(org, 'name', None) if org else None) or getattr(pkg, 'organizer_name', None) or "Organizer"
        group_title = f"{pkg.destination} by {org_name}"

        group = await self.repo.get_or_create_group(
            package_id=pkg.id,
            organizer_id=pkg.organizer_id,
            title=group_title,
        )
        # Ensure organizer user is added as admin/organizer member
        if org and org.user_id:
            await self.repo.add_member(group.id, org.user_id, role=GroupMemberRole.ORGANIZER)
        return group

    async def verify_access(self, group: TripGroup, user: User) -> str:
        """Verify user is either the trip's organizer or a traveler with a CONFIRMED booking."""
        user_role = user.role.value if hasattr(user.role, 'value') else str(user.role).upper()

        # 1. Check if user is the trip's organizer
        org = await self.organizer_repo.get_by_user_id(user.id)
        if org and (org.id == group.organizer_id or org.user_id == user.id):
            await self.repo.add_member(group.id, user.id, role=GroupMemberRole.ORGANIZER)
            return "ORGANIZER"

        if user_role == UserRole.ORGANIZER.value or user_role == "ORGANIZER":
            if org and org.id == group.organizer_id:
                await self.repo.add_member(group.id, user.id, role=GroupMemberRole.ORGANIZER)
                return "ORGANIZER"

        # 2. Check if user is a traveler with a CONFIRMED booking for this package
        booking_result = await self.db.execute(
            select(Booking).where(
                and_(
                    Booking.package_id == group.package_id,
                    Booking.user_id == user.id,
                    Booking.status == BookingStatus.CONFIRMED,
                )
            )
        )
        booking = booking_result.scalar_one_or_none()
        if booking:
            # Ensure traveler is registered in members table
            await self.repo.add_member(group.id, user.id, role=GroupMemberRole.TRAVELER)
            return "TRAVELER"

        raise AuthorizationError("Access denied: Only confirmed travelers and the trip organizer can access this group.")

    async def get_group_details(self, package_id: str, current_user: User) -> Dict[str, Any]:
        group = await self.get_or_create_for_package(package_id)
        sender_role = await self.verify_access(group, current_user)

        # Refresh group with members
        refreshed_group = await self.repo.get_by_id(group.id)
        pkg = refreshed_group.package
        org = refreshed_group.organizer

        confirmed_count = await self.repo.count_confirmed_travelers(package_id)

        # Format members list (sanitized: only name, role, profile picture, join date)
        members_data = []
        for m in (refreshed_group.members or []):
            if m.user:
                members_data.append({
                    "id": m.id,
                    "user_id": m.user_id,
                    "name": m.user.name or ("Organizer" if m.role == GroupMemberRole.ORGANIZER else "Traveler"),
                    "profile_picture": m.user.profile_picture,
                    "role": m.role.value if hasattr(m.role, 'value') else m.role,
                    "joined_at": m.joined_at.isoformat() if m.joined_at else "",
                })

        return {
            "id": refreshed_group.id,
            "package_id": refreshed_group.package_id,
            "organizer_id": refreshed_group.organizer_id,
            "title": refreshed_group.title,
            "destination": pkg.destination if pkg else None,
            "duration_days": pkg.duration_days if pkg else None,
            "price_per_person": pkg.price_per_person if pkg else None,
            "max_travelers": pkg.max_travelers if pkg else 20,
            "confirmed_travelers_count": confirmed_count,
            "organizer_name": org.name if org else "Organizer",
            "members": members_data,
            "created_at": refreshed_group.created_at.isoformat() if refreshed_group.created_at else "",
        }

    async def list_messages(self, package_id: str, current_user: User) -> List[Dict[str, Any]]:
        group = await self.get_or_create_for_package(package_id)
        await self.verify_access(group, current_user)
        messages = await self.repo.list_messages(group.id)

        return [
            {
                "id": msg.id,
                "group_id": msg.group_id,
                "sender_id": msg.sender_id,
                "sender_name": msg.sender_name,
                "sender_role": msg.sender_role,
                "sender_profile_picture": (msg.sender.profile_picture if msg.sender and hasattr(msg.sender, 'profile_picture') else None) or (f"https://api.dicebear.com/7.x/initials/svg?seed={msg.sender_name}"),
                "message": msg.message,
                "created_at": msg.created_at.isoformat() if msg.created_at else "",
            }
            for msg in messages
        ]

    async def post_message(self, package_id: str, message_text: str, current_user: User) -> Dict[str, Any]:
        if not message_text or not message_text.strip():
            raise ValidationError("Message cannot be empty.")

        group = await self.get_or_create_for_package(package_id)
        sender_role = await self.verify_access(group, current_user)

        sender_name = current_user.name or ("Organizer" if sender_role == "ORGANIZER" else "Traveler")

        msg = await self.repo.create_message(
            group_id=group.id,
            sender_id=current_user.id,
            sender_name=sender_name,
            sender_role=sender_role,
            message=message_text.strip(),
        )

        # Dispatch in-app notifications to other group participants (Host & Travelers)
        try:
            from app.services.notification_service import NotificationService
            notif_svc = NotificationService(self.db)
            
            # 1. Notify organizer if sender is a traveler
            org_user_id = group.organizer.user_id if group.organizer else None
            if org_user_id and org_user_id != current_user.id:
                await notif_svc.notify_new_group_message(
                    recipient_user_id=org_user_id,
                    package_id=package_id,
                    sender_name=sender_name,
                    group_title=group.title,
                    message_text=message_text.strip(),
                )

            # 2. Notify all confirmed traveler members in this group
            for member in (group.members or []):
                if member.user_id and member.user_id != current_user.id and member.user_id != org_user_id:
                    await notif_svc.notify_new_group_message(
                        recipient_user_id=member.user_id,
                        package_id=package_id,
                        sender_name=sender_name,
                        group_title=group.title,
                        message_text=message_text.strip(),
                    )
        except Exception as e:
            logger.warning(f"Failed to create group message notifications: {e}")

        return {
            "id": msg.id,
            "group_id": msg.group_id,
            "sender_id": msg.sender_id,
            "sender_name": msg.sender_name,
            "sender_role": msg.sender_role,
            "sender_profile_picture": (current_user.profile_picture if hasattr(current_user, 'profile_picture') else None) or (f"https://api.dicebear.com/7.x/initials/svg?seed={sender_name}"),
            "message": msg.message,
            "created_at": msg.created_at.isoformat() if msg.created_at else "",
        }

    async def enroll_confirmed_traveler(self, package_id: str, traveler_user_id: str):
        """Automatically enroll confirmed traveler into the trip group."""
        group = await self.get_or_create_for_package(package_id)
        await self.repo.add_member(group.id, traveler_user_id, role=GroupMemberRole.TRAVELER)

    async def list_organizer_groups(self, current_organizer: Organizer) -> List[Dict[str, Any]]:
        """List all trip groups owned by the authenticated organizer, ensuring only active, existing packages have groups."""
        # Auto-provision group for each ACTIVE package owned by this organizer
        pkgs = await self.package_repo.list_all(organizer_id=current_organizer.id, include_inactive=False)
        active_pkg_ids = {p.id for p in pkgs}

        for p in pkgs:
            try:
                await self.get_or_create_for_package(p.id)
            except Exception as e:
                logger.warning(f"Failed to auto-provision group for package {p.id}: {e}")

        groups = await self.repo.list_groups_by_organizer(current_organizer.id)
        res = []
        for g in groups:
            # If package was deleted or is no longer active, skip and purge orphan group
            if g.package_id not in active_pkg_ids:
                continue

            pkg = g.package
            if not pkg or not getattr(pkg, 'is_active', True):
                continue

            confirmed_count = await self.repo.count_confirmed_travelers(g.package_id)
            max_cap = pkg.max_travelers if pkg and pkg.max_travelers else 20
            last_msg = g.messages[-1] if g.messages else None

            res.append({
                "id": g.id,
                "package_id": g.package_id,
                "title": g.title,
                "destination": pkg.destination if pkg else None,
                "image_url": pkg.image_url if pkg else None,
                "organizer_name": current_organizer.name or current_organizer.business_name or "Organizer",
                "confirmed_travelers_count": confirmed_count,
                "max_travelers": max_cap,
                "is_full": confirmed_count >= max_cap,
                "last_message": last_msg.message if last_msg else None,
                "last_message_at": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
            })
        return res

    async def list_traveler_groups(self, current_user: User) -> List[Dict[str, Any]]:
        """List all trip groups for which the traveler has confirmed reservations."""
        # Find all confirmed bookings for this user
        bookings_res = await self.db.execute(
            select(Booking).where(
                and_(Booking.user_id == current_user.id, Booking.status == BookingStatus.CONFIRMED)
            )
        )
        confirmed_bookings = list(bookings_res.scalars().all())
        pkg_ids = list(set([b.package_id for b in confirmed_bookings if b.package_id]))

        res = []
        for pid in pkg_ids:
            pkg = await self.package_repo.get_by_id(pid)
            if not pkg or not getattr(pkg, 'is_active', True):
                continue

            group = await self.get_or_create_for_package(pid)
            refreshed = await self.repo.get_by_id(group.id)
            org = refreshed.organizer
            confirmed_count = await self.repo.count_confirmed_travelers(pid)
            max_cap = pkg.max_travelers if pkg and pkg.max_travelers else 20
            last_msg = refreshed.messages[-1] if refreshed.messages else None

            res.append({
                "id": refreshed.id,
                "package_id": refreshed.package_id,
                "title": refreshed.title,
                "destination": pkg.destination if pkg else None,
                "organizer_name": org.name if org else "Organizer",
                "confirmed_travelers_count": confirmed_count,
                "max_travelers": max_cap,
                "is_full": confirmed_count >= max_cap,
                "last_message": last_msg.message if last_msg else None,
                "last_message_at": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
            })
        return res
