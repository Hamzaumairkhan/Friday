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

        if not trip_id or not package_id or not travelers or travelers < 1:
            raise ValidationError("trip_id, package_id, and a valid travelers count (>=1) are required")

        # 1. Validate trip & membership
        trip = await self.trip_repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundError(f"Trip '{trip_id}' not found")

        is_member = await self.trip_repo.is_trip_member(trip_id=trip_id, user_id=user_id)
        if not is_member:
            raise AuthorizationError("Only trip members can initiate bookings")

        # 2. Authoritative Package Resolution (Do NOT trust frontend metadata)
        pkg_res = await self.db.execute(select(Package).where(Package.id == package_id))
        package = pkg_res.scalar_one_or_none()
        if not package or not package.is_active:
            raise NotFoundError(f"Package '{package_id}' is not active or does not exist")

        # 3. Authoritative Organizer Resolution
        organizer = await self.organizer_repo.get_by_id(package.organizer_id)
        if not organizer:
            raise NotFoundError("Tour organizer for this package not found")

        # 4. Capacity & Availability Verification
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

        # 5. Fetch traveler profile
        user_res = await self.db.execute(select(User).where(User.id == user_id))
        traveler_user = user_res.scalar_one_or_none()
        traveler_name = traveler_user.name if traveler_user and traveler_user.name else "Friday Traveler"
        traveler_email = traveler_user.email if traveler_user else "traveler@friday.pk"

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
        )

        created_booking = await self.booking_repo.create(booking)

        # 6. Trigger Email Notification to Organizer via Resend
        organizer_email = get_settings().ADMIN_EMAIL or organizer.contact_email or "organizer@friday.pk"
        subject = f"New Booking Request #{created_booking.id[:8]} — {created_booking.package_title} ({created_booking.destination})"
        
        # Travel dates text
        if trip.start_date and trip.end_date:
            dates_text = f"{trip.start_date} to {trip.end_date}"
        elif trip.start_date:
            dates_text = f"Starting {trip.start_date}"
        else:
            dates_text = "To be confirmed"

        email_body = (
            f"Dear {created_booking.organizer_name},\n\n"
            f"You have received a new booking request through Friday AI Travel Marketplace.\n\n"
            f"--- BOOKING DETAILS ---\n"
            f"• Booking ID: {created_booking.id}\n"
            f"• Traveler Name: {created_booking.traveler_name} ({traveler_email})\n"
            f"• Destination: {created_booking.destination}\n"
            f"• Package: {created_booking.package_title}\n"
            f"• Number of Travelers: {created_booking.travelers}\n"
            f"• Total Package Price: Rs. {created_booking.total_price:,.0f} (Rs. {created_booking.price_per_person:,.0f}/person)\n"
            f"• Duration: {created_booking.duration_days} days\n"
            f"• Travel Dates: {dates_text}\n"
            f"• Special Requirements / Notes: {notes or 'None provided'}\n\n"
            f"Please log in to your Friday organizer dashboard or reply to this email to confirm the reservation.\n\n"
            f"Best regards,\n"
            f"Friday AI Travel Marketplace Team"
        )

        from app.services.email_template_service import render_new_booking_alert_for_organizer
        html_body = render_new_booking_alert_for_organizer(
            booking_id=created_booking.id,
            organizer_name=created_booking.organizer_name or "Organizer",
            traveler_name=created_booking.traveler_name or "Traveler",
            package_title=created_booking.package_title or "Tour Package",
            destination=created_booking.destination or "Pakistan",
            total_price=created_booking.total_price or 0.0,
            travelers=created_booking.travelers or 1,
            notes=notes,
        )

        email_result = await self.email_tool.send_email(
            to=organizer_email,
            subject=subject,
            body=email_body,
            html=html_body,
        )
        logger.info(f"Booking notification email dispatched. Result: {email_result}")

        # 7. Trigger WhatsApp / SMS Alert to Organizer Phone
        organizer_phone = organizer.contact_phone or "+923001234567"
        whatsapp_msg = (
            f"🌄 *FRIDAY TRAVEL MARKETPLACE — NEW BOOKING REQUEST*\n\n"
            f"Dear {created_booking.organizer_name},\n"
            f"A new booking request has been initiated:\n\n"
            f"📌 *Booking ID*: #{created_booking.id[:8]}\n"
            f"👤 *Traveler*: {created_booking.traveler_name}\n"
            f"📍 *Destination*: {created_booking.destination}\n"
            f"📦 *Package*: {created_booking.package_title}\n"
            f"👥 *Travelers*: {created_booking.travelers} persons\n"
            f"⏱️ *Duration*: {created_booking.duration_days} days\n"
            f"💰 *Total Amount*: Rs. {created_booking.total_price:,.0f}\n"
            f"📝 *Notes*: {notes or 'Standard request'}\n\n"
            f"Please check your Friday Organizer portal to confirm this reservation."
        )

        await self.whatsapp_tool.send_whatsapp(to_number=organizer_phone, message=whatsapp_msg)
        await self.whatsapp_tool.send_sms(to_number=organizer_phone, message=whatsapp_msg)

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
