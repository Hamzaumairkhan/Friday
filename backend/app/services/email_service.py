"""Email Service implementing Resend-powered transactional email workflows with luxury HTML templates."""

from typing import Dict, Any, Optional, List
from app.tools.email import EmailTool
from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.email_template_service import (
    render_booking_confirmation_email,
    render_new_booking_alert_for_organizer,
    render_itinerary_email,
    render_trip_planned_notification_email,
    render_organizer_package_published_email,
    render_organizer_payment_uploaded_email,
    render_traveler_booking_approved_email,
    _get_base_layout,
)

logger = get_logger("services.email")
settings = get_settings()


class EmailService:
    """High-level transactional email service for Friday platform."""

    def __init__(self, email_tool: Optional[EmailTool] = None):
        self.email_tool = email_tool or EmailTool()

    async def send_booking_confirmation(
        self,
        booking_id: str,
        traveler_email: str,
        traveler_name: str,
        package_title: str,
        destination: str,
        total_price: float,
        travelers: int,
        organizer_name: str = "Verified Tour Organizer",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send professional branded booking confirmation and receipt to traveler."""
        subject = f"Booking Confirmation #{booking_id[:8].upper()} — {package_title}"
        plain_body = (
            f"Dear {traveler_name},\n\n"
            f"Your booking #{booking_id[:8]} for '{package_title}' in {destination} is confirmed!\n"
            f"• Number of Travelers: {travelers}\n"
            f"• Total Amount: Rs. {total_price:,.0f}\n"
            f"• Host Organizer: {organizer_name}\n\n"
            f"Log in to your Friday dashboard to enter your private trip group: http://localhost:5173/my-trips\n\n"
            f"Warm regards,\n"
            f"Friday Travel Marketplace"
        )

        html_body = render_booking_confirmation_email(
            booking_id=booking_id,
            traveler_name=traveler_name,
            package_title=package_title,
            destination=destination,
            total_price=total_price,
            travelers=travelers,
            organizer_name=organizer_name,
            start_date=start_date,
            end_date=end_date,
        )

        return await self.email_tool.send_email(
            to=traveler_email,
            subject=subject,
            body=plain_body,
            html=html_body,
        )

    async def send_booking_alert_to_organizer(
        self,
        booking_id: str,
        organizer_email: str,
        organizer_name: str,
        traveler_name: str,
        package_title: str,
        destination: str,
        total_price: float,
        travelers: int,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Notify organizer of a new traveler booking reservation."""
        subject = f"New Booking Request #{booking_id[:8].upper()} — {package_title}"
        plain_body = (
            f"Hello {organizer_name},\n\n"
            f"You received a new booking from {traveler_name} for '{package_title}' ({travelers} travelers).\n"
            f"Expected total: Rs. {total_price:,.0f}\n\n"
            f"Review in your workspace: http://localhost:5173/organizer/bookings\n\n"
            f"Best,\nFriday Platform"
        )

        html_body = render_new_booking_alert_for_organizer(
            booking_id=booking_id,
            organizer_name=organizer_name,
            traveler_name=traveler_name,
            package_title=package_title,
            destination=destination,
            total_price=total_price,
            travelers=travelers,
            notes=notes,
        )

        return await self.email_tool.send_email(
            to=organizer_email,
            subject=subject,
            body=plain_body,
            html=html_body,
        )

    async def send_booking_status_update(
        self,
        booking_id: str,
        traveler_email: str,
        traveler_name: str,
        new_status: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Notify traveler regarding status change (e.g. CONFIRMED, PAYMENT_VERIFIED, REJECTED)."""
        subject = f"Booking #{booking_id[:8].upper()} Status Update: {new_status.upper()}"
        plain_body = (
            f"Dear {traveler_name},\n\n"
            f"The status of your Friday booking #{booking_id[:8]} has been updated to: {new_status.upper()}.\n\n"
            f"Organizer Notes: {notes or 'No additional notes provided.'}\n\n"
            f"Log in to your Friday dashboard anytime: http://localhost:5173/my-trips\n\n"
            f"Best regards,\n"
            f"Friday Travel Marketplace"
        )

        content_html = f"""
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; background-color: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
            Booking Status Update
          </span>
        </div>
        <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; color: #0a0a0a; text-align: center;">
          Booking Status: {new_status.upper()}
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
          Hello {traveler_name}, your booking <strong>#{booking_id[:8].upper()}</strong> has been updated.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #334155;">
          <strong>Organizer Note:</strong> {notes or 'Status has been synchronized in the system.'}
        </div>
        """

        html_body = _get_base_layout(
            title=subject,
            preheader=f"Booking #{booking_id[:8]} updated to {new_status}",
            content_html=content_html,
            action_url="http://localhost:5173/my-trips",
            action_text="View Booking Status →",
        )

        return await self.email_tool.send_email(
            to=traveler_email,
            subject=subject,
            body=plain_body,
            html=html_body,
        )

    async def send_itinerary(
        self,
        trip_id: str,
        traveler_email: str,
        traveler_name: str,
        destination: str,
        duration: int,
        itinerary_days: List[Dict[str, Any]],
        budget_summary: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send complete structured day-by-day travel plan and budget breakdown with HTML formatting."""
        subject = f"Your {duration}-Day {destination} Travel Plan — Friday AI Copilot"
        
        days_text = ""
        for day in itinerary_days:
            day_num = day.get("day_number", 1)
            title = day.get("title", f"Day {day_num}")
            summary = day.get("summary", "")
            days_text += f"\n[Day {day_num}: {title}]\n{summary}\n"

        plain_body = (
            f"Dear {traveler_name},\n\n"
            f"Here is your AI-crafted {duration}-day trip itinerary for {destination}:\n\n"
            f"{days_text}\n\n"
            f"View your interactive itinerary: http://localhost:5173/trips/{trip_id}\n\n"
            f"Safe travels,\n"
            f"Friday AI Travel Copilot"
        )

        html_body = render_itinerary_email(
            trip_id=trip_id,
            traveler_name=traveler_name,
            destination=destination,
            duration=duration,
            itinerary_days=itinerary_days,
            budget_summary=budget_summary,
            dashboard_url=f"http://localhost:5173/trips/{trip_id}",
        )

        return await self.email_tool.send_email(
            to=traveler_email,
            subject=subject,
            body=plain_body,
            html=html_body,
        )

    async def send_trip_planned_notification(
        self,
        trip_id: str,
        traveler_email: str,
        traveler_name: str,
        trip_title: str,
        destination: str,
        travelers_count: int,
        budget_total: float,
    ) -> Dict[str, Any]:
        """Send clean minimal trip planned notification with title, travelers count, budget, and direct link."""
        trip_url = f"http://localhost:5173/trips/{trip_id}"
        subject = f"Your Trip Has Been Planned — {trip_title}"
        plain_body = (
            f"Dear {traveler_name},\n\n"
            f"Your trip '{trip_title}' to {destination} has been planned!\n"
            f"• Number of Travelers: {travelers_count}\n"
            f"• Estimated Budget: Rs. {budget_total:,.0f}\n\n"
            f"View your trip details: {trip_url}\n\n"
            f"Safe travels,\n"
            f"Friday Travel Copilot"
        )
        html_body = render_trip_planned_notification_email(
            trip_id=trip_id,
            traveler_name=traveler_name,
            trip_title=trip_title,
            destination=destination,
            travelers_count=travelers_count,
            budget_total=budget_total,
            trip_url=trip_url,
        )
        return await self.email_tool.send_email(
            to=traveler_email,
            subject=subject,
            body=plain_body,
            html=html_body,
        )

    async def send_organizer_package_published_email(
        self,
        organizer_email: str,
        organizer_name: str,
        package_id: str,
        package_title: str,
        destination: str,
        duration_days: int,
        price_per_person: float,
    ) -> Dict[str, Any]:
        """Send confirmation email to Organizer when they publish a tour package."""
        package_url = f"http://localhost:5173/packages/{package_id}"
        subject = f"Your Tour Package Has Been Published — {package_title}"
        plain_body = (
            f"Dear {organizer_name},\n\n"
            f"Your tour package '{package_title}' for {destination} has been published!\n"
            f"• Duration: {duration_days} Days\n"
            f"• Price per Person: Rs. {price_per_person:,.0f}\n\n"
            f"View your live package on the marketplace: {package_url}\n\n"
            f"Best regards,\n"
            f"Friday Travel Marketplace"
        )
        html_body = render_organizer_package_published_email(
            package_id=package_id,
            organizer_name=organizer_name,
            package_title=package_title,
            destination=destination,
            duration_days=duration_days,
            price_per_person=price_per_person,
            package_url=package_url,
        )
        return await self.email_tool.send_email(
            to=organizer_email,
            subject=subject,
            body=plain_body,
            html=html_body,
        )

    async def send_organizer_payment_uploaded_email(
        self,
        organizer_email: str,
        organizer_name: str,
        booking_id: str,
        traveler_name: str,
        traveler_phone: str,
        package_title: str,
        destination: str,
        travelers: int,
        total_price: float,
    ) -> Dict[str, Any]:
        """Alert organizer that a traveler uploaded bank payment proof."""
        review_url = "http://localhost:5173/organizer/bookings"
        subject = f"Payment Proof Uploaded — #{booking_id[:8].upper()} ({package_title})"
        plain_body = (
            f"Hello {organizer_name},\n\n"
            f"Traveler {traveler_name} ({traveler_phone}) has uploaded payment proof for '{package_title}'.\n"
            f"• Reserved Seats: {travelers}\n"
            f"• Total Amount: Rs. {total_price:,.0f}\n\n"
            f"Please verify the payment proof: {review_url}\n\n"
            f"Best regards,\n"
            f"Friday Travel Marketplace"
        )
        html_body = render_organizer_payment_uploaded_email(
            booking_id=booking_id,
            organizer_name=organizer_name,
            traveler_name=traveler_name,
            traveler_phone=traveler_phone,
            package_title=package_title,
            destination=destination,
            travelers=travelers,
            total_price=total_price,
            review_url=review_url,
        )
        return await self.email_tool.send_email(
            to=organizer_email,
            subject=subject,
            body=plain_body,
            html=html_body,
        )

    async def send_traveler_booking_approved_email(
        self,
        traveler_email: str,
        traveler_name: str,
        booking_id: str,
        package_id: str,
        package_title: str,
        destination: str,
        travelers: int,
        total_price: float,
        organizer_name: str,
    ) -> Dict[str, Any]:
        """Notify traveler that organizer approved their booking and invite to Group Chat."""
        group_chat_url = f"http://localhost:5173/trips/{package_id}/group"
        subject = f"Booking Verified & Confirmed — {package_title}"
        plain_body = (
            f"Dear {traveler_name},\n\n"
            f"Your booking for '{package_title}' in {destination} has been verified and confirmed by {organizer_name}!\n"
            f"• Number of Travelers: {travelers}\n"
            f"• Total Paid: Rs. {total_price:,.0f}\n\n"
            f"Join your private expedition group chat: {group_chat_url}\n\n"
            f"Safe travels,\n"
            f"Friday Travel Marketplace"
        )
        html_body = render_traveler_booking_approved_email(
            booking_id=booking_id,
            traveler_name=traveler_name,
            package_title=package_title,
            destination=destination,
            travelers=travelers,
            total_price=total_price,
            organizer_name=organizer_name,
            group_chat_url=group_chat_url,
        )
        return await self.email_tool.send_email(
            to=traveler_email,
            subject=subject,
            body=plain_body,
            html=html_body,
        )
