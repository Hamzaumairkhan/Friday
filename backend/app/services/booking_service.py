"""Booking service with immutable package snapshot derivation and Resend email / WhatsApp alerts."""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.booking import Booking, BookingStatus
from app.models.package import Package
from app.models.organizer import Organizer
from app.models.trip import Trip
from app.models.user import User
from app.schemas.booking import BookingCreate
from app.repositories.booking_repository import BookingRepository
from app.repositories.organizer_repository import OrganizerRepository
from app.repositories.trip_repository import TripRepository
from app.tools.email import EmailTool
from app.tools.whatsapp import WhatsAppTool
from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ValidationError, AuthorizationError
from app.core.logging import get_logger

logger = get_logger("services.booking")


class BookingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.booking_repo = BookingRepository(db)
        self.organizer_repo = OrganizerRepository(db)
        self.trip_repo = TripRepository(db)
        self.email_tool = EmailTool()
        self.whatsapp_tool = WhatsAppTool()

    async def create_booking_request(
        self,
        user_id: str,
        data: Optional[BookingCreate] = None,
        trip_id: Optional[str] = None,
        package_id: Optional[str] = None,
        travelers: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> Booking:
        """Create a booking request deriving authoritative metadata directly from the Package entity."""
        if data:
            trip_id = data.trip_id
            package_id = data.package_id
            travelers = data.travelers
            notes = data.notes

        if not package_id or not travelers or travelers < 1:
            raise ValidationError("package_id and a valid travelers count (>=1) are required")

        # 1. Authoritative Package Resolution (Do NOT trust frontend metadata)
        pkg_res = await self.db.execute(select(Package).where(Package.id == package_id))
        package = pkg_res.scalar_one_or_none()
        if not package or not package.is_active:
            raise NotFoundError(f"Package '{package_id}' is not active or does not exist")

        # 2. Ensure traveler user record exists in users table
        from app.models.user import UserRole
        import re
        user_res = await self.db.execute(select(User).where(User.id == user_id))
        traveler_user = user_res.scalar_one_or_none()
        if not traveler_user:
            traveler_user = User(
                id=user_id,
                email=f"{user_id}@friday.local",
                name="Friday Traveler",
                role=UserRole.TRAVELER,
            )
            self.db.add(traveler_user)
            await self.db.flush()

        candidate_name = getattr(data, 'traveler_name', None) if data else None
        if not candidate_name and traveler_user and traveler_user.name and traveler_user.name not in ["Traveler", "Friday Traveler", "Anonymous Traveler"]:
            candidate_name = traveler_user.name
        if not candidate_name and traveler_user and traveler_user.email:
            username = traveler_user.email.split("@")[0]
            clean = re.sub(r'[^a-zA-Z\s]', ' ', username).strip().title()
            candidate_name = clean if clean else username
        traveler_name = candidate_name or "Verified Traveler"

        candidate_email = getattr(data, 'traveler_email', None) if data else None
        if not candidate_email and traveler_user and traveler_user.email:
            candidate_email = traveler_user.email
        traveler_email = candidate_email or "traveler@friday.pk"

        candidate_phone = getattr(data, 'traveler_phone', None) if data else None
        if not candidate_phone and traveler_user and getattr(traveler_user, 'phone', None):
            candidate_phone = traveler_user.phone
        traveler_phone = candidate_phone or "+92 300 1234567"

        # 3. Validate or auto-provision trip & membership
        if trip_id:
            trip = await self.trip_repo.get_by_id(trip_id)
            if not trip:
                raise NotFoundError(f"Trip '{trip_id}' not found")
            is_member = await self.trip_repo.is_trip_member(trip_id=trip_id, user_id=user_id)
            if not is_member:
                raise AuthorizationError("Only trip members can initiate bookings")
        else:
            import uuid
            from app.models.trip import Trip, TripStatus, TripMember, MemberRole
            trip_id = f"trip-{uuid.uuid4().hex[:12]}"
            trip = Trip(
                id=trip_id,
                owner_id=user_id,
                title=f"{package.title} (Booking)",
                destination=package.destination,
                origin="Islamabad",
                duration=package.duration_days,
                travelers=travelers,
                budget_total=package.price_per_person * travelers,
                budget_per_person=package.price_per_person,
                start_date=package.start_date,
                end_date=package.end_date,
                status=TripStatus.BOOKED,
                image_url=package.image_url,
            )
            await self.trip_repo.create(trip)
            owner_m = TripMember(
                trip_id=trip_id,
                user_id=user_id,
                role=MemberRole.OWNER,
            )
            await self.trip_repo.add_member(owner_m)

        # 4. Authoritative Organizer Resolution
        organizer = await self.organizer_repo.get_by_id(package.organizer_id)
        if not organizer:
            raise NotFoundError("Tour organizer for this package not found")

        # 5. Capacity & Availability Verification
        from sqlalchemy import func, and_
        confirmed_res = await self.db.execute(
            select(func.sum(Booking.travelers)).where(
                and_(Booking.package_id == package.id, Booking.status == BookingStatus.CONFIRMED)
            )
        )
        current_confirmed = confirmed_res.scalar() or 0
        if package.max_travelers and (current_confirmed + travelers > package.max_travelers):
            raise ValidationError(
                f"Trip capacity reached: Only {max(0, package.max_travelers - current_confirmed)} seat(s) remaining for this organizer trip."
            )

        # 6. Authoritative Price Calculation & Immutable Snapshot Derivation
        unit_price = package.price_per_person or 0.0
        total_price = unit_price * travelers

        booking = Booking(
            trip_id=trip_id,
            package_id=package.id,
            user_id=user_id,
            organizer_id=package.organizer_id,
            travelers=travelers,
            total_price=total_price,
            status=BookingStatus.PENDING,
            notes=notes,
            # Immutable Snapshot Persistence
            package_title=package.title,
            destination=package.destination,
            duration_days=package.duration_days,
            price_per_person=unit_price,
            organizer_name=organizer.name,
            traveler_name=traveler_name,
            traveler_email=traveler_email,
            traveler_phone=traveler_phone,
        )

        created_booking = await self.booking_repo.create(booking)
        logger.info(f"Booking #{created_booking.id} created in PENDING status. Organizer notifications will dispatch upon payment proof submission.")
        return created_booking

    async def get_booking(self, booking_id: str, user_id: str) -> Booking:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundError(f"Booking '{booking_id}' not found")
        if booking.user_id != user_id:
            raise AuthorizationError("Access denied to this booking")
        return booking

    async def list_user_bookings(self, user_id: str) -> List[Booking]:
        return await self.booking_repo.get_by_user(user_id)
