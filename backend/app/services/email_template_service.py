"""Professional HTML Email Template Builder for Friday Travel Platform."""

from typing import Dict, Any, Optional, List


def _get_base_layout(title: str, preheader: str, content_html: str, action_url: Optional[str] = None, action_text: Optional[str] = None) -> str:
    """Universal responsive email wrapper with Friday luxury minimal branding."""
    cta_html = ""
    if action_url and action_text:
        cta_html = f"""
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 16px 0;">
          <tr>
            <td align="center">
              <a href="{action_url}" target="_blank" style="display: inline-block; background-color: #0a0a0a; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px; letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                {action_text}
              </a>
            </td>
          </tr>
        </table>
        """

    return f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a {{ font-family: Arial, Helvetica, sans-serif !important; }}
  </style>
  <![endif]-->
  <style type="text/css">
    body {{
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }}
    table {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }}
    a {{ color: #0a0a0a; }}
    @media only screen and (max-width: 620px) {{
      .wrapper {{ width: 100% !important; padding: 12px !important; }}
      .content-card {{ padding: 24px 18px !important; }}
      .spec-grid-col {{ display: block !important; width: 100% !important; margin-bottom: 12px !important; }}
    }}
  </style>
</head>
<body style="background-color: #f8fafc; margin: 0; padding: 24px 0;">
  <!-- Preview Text -->
  <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    {preheader}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table class="wrapper" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; padding: 0 16px;">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding: 24px 0 20px 0;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 400; letter-spacing: 0.05em; color: #0a0a0a; text-transform: uppercase;">FRIDAY</span>
                    <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: #64748b; margin-top: 4px;">
                      AI Travel Copilot &amp; Marketplace
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main White Card -->
          <tr>
            <td>
              <table class="content-card" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);">
                <tr>
                  <td>
                    {content_html}
                    {cta_html}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 16px; text-align: center; font-size: 12px; line-height: 1.6; color: #94a3b8;">
              <p style="margin: 0 0 8px 0; font-weight: 500; color: #64748b;">
                Friday — AI Travel Copilot &amp; Tour Marketplace for Pakistan
              </p>
              <p style="margin: 0 0 12px 0;">
                Friday is an independent technology platform connecting travelers with verified local organizers. All tour packages are organized and operated directly by their respective host organizers.
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; 2026 Friday Inc. • Islamabad, Pakistan • All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def render_booking_confirmation_email(
    booking_id: str,
    traveler_name: str,
    package_title: str,
    destination: str,
    total_price: float,
    travelers: int,
    organizer_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    dashboard_url: str = "http://localhost:5173/my-trips",
) -> str:
    """Generate high-end booking confirmation email."""
    content_html = f"""
    <!-- Status Badge -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        ✓ Booking Confirmed &amp; Verified
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      Pack your bags, {traveler_name}!
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Your reservation for <strong>{package_title}</strong> is locked in. Your host organizer has verified your details and welcomed you to the expedition.
    </p>

    <!-- Specs Grid Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 20px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Destination</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">📍 {destination}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Travelers</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">👥 {travelers} Persons</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding: 12px 12px 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Total Amount</div>
          <div style="font-size: 17px; font-weight: 700; color: #047857; margin-top: 2px;">Rs. {total_price:,.0f}</div>
        </td>
        <td width="50%" valign="top" style="padding: 12px 12px 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Reference ID</div>
          <div style="font-size: 13px; font-family: monospace; font-weight: 600; color: #475569; margin-top: 2px;">#{booking_id[:8].upper()}</div>
        </td>
      </tr>
    </table>

    <!-- Host Organizer Info -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 24px;">
      <tr>
        <td width="42" valign="middle">
          <div style="width: 38px; height: 38px; border-radius: 50%; background-color: #047857; color: #ffffff; font-size: 15px; font-weight: 700; text-align: center; line-height: 38px;">
            {organizer_name[0] if organizer_name else 'O'}
          </div>
        </td>
        <td valign="middle" style="padding-left: 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b;">Tour Operator &amp; Host</div>
          <div style="font-size: 14px; font-weight: 600; color: #0f172a;">{organizer_name} <span style="color: #047857; font-size: 12px;">✓ Verified</span></div>
        </td>
      </tr>
    </table>

    <div style="font-size: 13px; line-height: 1.6; color: #475569; padding: 0 4px;">
      <p style="margin: 0 0 8px 0;"><strong>What's Next?</strong></p>
      <ul style="margin: 0; padding-left: 18px;">
        <li style="margin-bottom: 4px;">Join your private <strong>Trip Group</strong> in Friday to chat directly with your host organizer and fellow travelers.</li>
        <li style="margin-bottom: 4px;">Coordinate pickup locations, timing, and gear recommendations before departure.</li>
        <li>Access your trip details anytime in your Friday traveler dashboard.</li>
      </ul>
    </div>
    """

    return _get_base_layout(
        title=f"Booking Confirmation #{booking_id[:8]} — {package_title}",
        preheader=f"Your trip to {destination} with {organizer_name} is confirmed!",
        content_html=content_html,
        action_url=dashboard_url,
        action_text="Open Trip Group & View Details →",
    )


def render_new_booking_alert_for_organizer(
    booking_id: str,
    organizer_name: str,
    traveler_name: str,
    package_title: str,
    destination: str,
    total_price: float,
    travelers: int,
    notes: Optional[str] = None,
    dashboard_url: str = "http://localhost:5173/organizer/bookings",
) -> str:
    """Generate high-end notification email for tour organizers."""
    content_html = f"""
    <!-- Badge -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        ✦ New Booking Reservation
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      New Reservation Received
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{organizer_name}</strong>, a traveler has reserved seats for your package <strong>{package_title}</strong> on Friday Marketplace.
    </p>

    <!-- Key Info Grid -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 20px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Traveler Name</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">👤 {traveler_name}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Group Size</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">👥 {travelers} Traveler(s)</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding: 12px 12px 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Expected Total</div>
          <div style="font-size: 17px; font-weight: 700; color: #0f172a; margin-top: 2px;">Rs. {total_price:,.0f}</div>
        </td>
        <td width="50%" valign="top" style="padding: 12px 12px 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Booking ID</div>
          <div style="font-size: 13px; font-family: monospace; font-weight: 600; color: #475569; margin-top: 2px;">#{booking_id[:8].upper()}</div>
        </td>
      </tr>
    </table>

    <div style="font-size: 13px; line-height: 1.6; color: #475569; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
      <strong>Payment Proof Workflow:</strong> The traveler has received your payment details and will upload proof of transfer. Once submitted, review and verify the transaction to enroll the traveler in your trip group.
    </div>
    """

    return _get_base_layout(
        title=f"New Booking Request #{booking_id[:8]} — {package_title}",
        preheader=f"New booking from {traveler_name} for {package_title}",
        content_html=content_html,
        action_url=dashboard_url,
        action_text="Open Organizer Workspace →",
    )


def render_itinerary_email(
    trip_id: str,
    traveler_name: str,
    destination: str,
    duration: int,
    itinerary_days: List[Dict[str, Any]],
    budget_summary: Optional[Dict[str, Any]] = None,
    dashboard_url: str = "http://localhost:5173/my-trips",
) -> str:
    """Generate high-end AI itinerary summary email."""
    days_html = ""
    for day in itinerary_days:
        day_num = day.get("day_number", 1)
        title = day.get("title", f"Day {day_num}")
        summary = day.get("summary", "")
        days_html += f"""
        <div style="margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
          <div style="font-size: 12px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.05em;">Day {day_num}</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 2px 0 6px 0;">{title}</div>
          <div style="font-size: 13px; color: #475569; line-height: 1.5;">{summary}</div>
        </div>
        """

    budget_html = ""
    if budget_summary:
        budget_html = f"""
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin: 20px 0;">
          <tr>
            <td style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Estimated Budget</td>
            <td align="right" style="font-size: 16px; font-weight: 700; color: #0a0a0a;">Rs. {budget_summary.get('total_estimated', 0):,.0f}</td>
          </tr>
        </table>
        """

    content_html = f"""
    <!-- Badge -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #f3f4f6; color: #1f2937; border: 1px solid #e5e7eb; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        ✨ Friday AI Travel Copilot
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      Your {duration}-Day {destination} Expedition
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello {traveler_name}, here is your personalized day-by-day travel plan curated with smart route planning and local logistics.
    </p>

    <!-- Itinerary Stream -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 20px;">
      {days_html}
    </div>

    {budget_html}
    """

    return _get_base_layout(
        title=f"Your {duration}-Day {destination} Itinerary — Friday",
        preheader=f"Custom AI travel plan for {destination}",
        content_html=content_html,
        action_url=dashboard_url,
        action_text="View Interactive Map & Itinerary →",
    )
