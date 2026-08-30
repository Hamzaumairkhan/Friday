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
    """Generate high-end AI itinerary summary email with full day-by-day stops and Google Maps links."""
    days_html = ""
    for day in itinerary_days:
        day_num = day.get("day_number", 1)
        title = day.get("title", f"Day {day_num}")
        summary = day.get("summary", "")
        activities = day.get("activities", [])

        acts_html = ""
        for act in activities:
            act_title = act.get("title") or "Activity"
            act_desc = act.get("description") or ""
            act_loc = act.get("location") or destination
            start_t = act.get("start_time") or ""
            end_t = act.get("end_time") or ""
            time_str = f"{start_t} – {end_t}" if start_t and end_t else start_t
            category = act.get("category", "SIGHTSEEING")
            cost = act.get("estimated_cost", 0)
            map_url = act.get("map_url") or f"https://www.google.com/maps/search/?api=1&query={act_loc.replace(' ', '+')}"

            cost_tag = f'<span style="font-size: 11px; font-weight: 700; color: #047857; background-color: #ecfdf5; padding: 2px 8px; border-radius: 6px;">PKR {cost:,.0f}</span>' if cost > 0 else '<span style="font-size: 11px; color: #94a3b8;">Free / En-Route</span>'
            time_tag = f'<span style="font-size: 11px; font-weight: 600; color: #334155; margin-right: 8px;">⏱ {time_str}</span>' if time_str else ""

            acts_html += f"""
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f766e; background-color: #ccfbf1; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                  {category}
                </span>
                <div style="text-align: right;">
                  {cost_tag}
                </div>
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 4px 0 2px 0;">
                {act_title}
              </div>
              {f'<div style="font-size: 12px; color: #475569; line-height: 1.4; margin-bottom: 6px;">{act_desc}</div>' if act_desc else ''}
              <div style="font-size: 12px; color: #64748b; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
                {time_tag}
                <a href="{map_url}" target="_blank" style="color: #047857; text-decoration: none; font-weight: 600; font-size: 11px; display: inline-block;">
                  📍 {act_loc} <span style="font-size: 9px;">↗ Google Maps</span>
                </a>
              </div>
            </div>
            """

        days_html += f"""
        <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
          <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">
            DAY {day_num}
          </div>
          <div style="font-size: 17px; font-weight: 700; color: #0f172a; margin: 2px 0 6px 0;">
            {title}
          </div>
          {f'<div style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 12px;">{summary}</div>' if summary else ''}
          {acts_html}
        </div>
        """

    # Resolve accurate total budget
    total_budget = 0.0
    breakdown_rows = ""
    if budget_summary:
        total_budget = float(budget_summary.get("total") or budget_summary.get("total_estimated") or 0.0)
        
        # Build category breakdown rows
        cats = [
            ("Accommodation & Lodging", budget_summary.get("accommodation", 0)),
            ("Transit & High-Altitude Jeeps", budget_summary.get("transport", 0)),
            ("Local Meals & Regional Cuisine", budget_summary.get("food", 0)),
            ("Activities, Permits & Guides", budget_summary.get("activities", 0)),
            ("Contingency & Miscellaneous", budget_summary.get("other", 0)),
        ]
        for cat_name, cat_amt in cats:
            if cat_amt > 0:
                breakdown_rows += f"""
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b;">{cat_name}</td>
                  <td align="right" style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #0f172a;">Rs. {float(cat_amt):,.0f}</td>
                </tr>
                """

    budget_html = f"""
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0;">
      <tr>
        <td style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px;">
          Estimated Total Budget
        </td>
        <td align="right" style="font-size: 18px; font-weight: 800; color: #047857; padding-bottom: 8px;">
          Rs. {total_budget:,.0f}
        </td>
      </tr>
      {breakdown_rows}
    </table>
    """

    content_html = f"""
    <!-- Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        ✦ Friday AI Travel Copilot
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 8px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      Your {duration}-Day {destination} Expedition
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{traveler_name}</strong>, here is your complete personalized itinerary curated with verified logistics, scenic photo stops, and authentic points of interest.
    </p>

    <!-- Itinerary Feed -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 20px;">
      {days_html}
    </div>

    {budget_html}

    <div style="font-size: 12px; color: #64748b; background-color: #f1f5f9; border-radius: 10px; padding: 12px 16px; text-align: center; margin-bottom: 8px;">
      🔒 <strong>Private Expedition Vault:</strong> This itinerary is accessible only by registered travelers in your expedition group.
    </div>
    """

    return _get_base_layout(
        title=f"Your {duration}-Day {destination} Itinerary — Friday",
        preheader=f"Custom AI travel plan for {destination} with Google Maps links",
        content_html=content_html,
        action_url=dashboard_url,
        action_text="View Interactive Itinerary & Maps →",
    )


def render_trip_planned_notification_email(
    trip_id: str,
    traveler_name: str,
    trip_title: str,
    destination: str,
    travelers_count: int,
    budget_total: float,
    trip_url: str = "http://localhost:5173/my-trips",
) -> str:
    """Clean minimal email notifying traveler/companions that their trip has been planned with title, budget, travelers count, and direct link."""
    content_html = f"""
    <!-- Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        ✓ Your Trip Has Been Planned
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      {trip_title}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{traveler_name}</strong>, your trip to <strong>{destination}</strong> is ready.
    </p>

    <!-- Essential Specs Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Travelers</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">👥 {travelers_count} Person{'' if travelers_count == 1 else 's'}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Estimated Budget</div>
          <div style="font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px;">Rs. {budget_total:,.0f}</div>
        </td>
      </tr>
    </table>
    """

    return _get_base_layout(
        title=f"Your Trip Has Been Planned — {trip_title}",
        preheader=f"{trip_title} • {travelers_count} Travelers • Rs. {budget_total:,.0f}",
        content_html=content_html,
        action_url=trip_url,
        action_text="View Trip Details & Itinerary →",
    )


def render_organizer_package_published_email(
    package_id: str,
    organizer_name: str,
    package_title: str,
    destination: str,
    duration_days: int,
    price_per_person: float,
    package_url: str = "http://localhost:5173/organizer/trips",
) -> str:
    """Email sent to Organizer when they create/publish a tour package."""
    content_html = f"""
    <!-- Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        ✓ Expedition Organized &amp; Published
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      {package_title}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{organizer_name}</strong>, your tour package has been published and is now live on the Friday traveler marketplace.
    </p>

    <!-- Specs Grid Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Destination</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">📍 {destination}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Duration</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">⏱ {duration_days} Days</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Price / Person</div>
          <div style="font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px;">Rs. {price_per_person:,.0f}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Status</div>
          <div style="font-size: 13px; font-weight: 700; color: #047857; margin-top: 2px;">● LIVE ON EXPLORE FEED</div>
        </td>
      </tr>
    </table>
    """

    return _get_base_layout(
        title=f"Expedition Published — {package_title}",
        preheader=f"Your package '{package_title}' is now live on Friday marketplace.",
        content_html=content_html,
        action_url=package_url,
        action_text="View Package in Workspace →",
    )


def render_organizer_payment_uploaded_email(
    booking_id: str,
    organizer_name: str,
    traveler_name: str,
    traveler_phone: str,
    package_title: str,
    destination: str,
    travelers: int,
    total_price: float,
    review_url: str = "http://localhost:5173/organizer/bookings",
) -> str:
    """Email sent to Organizer when a traveler uploads bank payment proof."""
    content_html = f"""
    <!-- Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        ⚡ Payment Proof Uploaded
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      Verify Payment for #{booking_id[:8].upper()}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{organizer_name}</strong>, traveler <strong>{traveler_name}</strong> has submitted payment proof for <strong>{package_title}</strong>.
    </p>

    <!-- Specs Grid Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Traveler Name</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">👤 {traveler_name}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Phone / WhatsApp</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">📞 {traveler_phone or 'Not provided'}</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Reserved Seats</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">👥 {travelers} Traveler{'' if travelers == 1 else 's'}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Total Amount</div>
          <div style="font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px;">Rs. {total_price:,.0f}</div>
        </td>
      </tr>
    </table>
    """

    return _get_base_layout(
        title=f"Payment Proof Uploaded — #{booking_id[:8].upper()}",
        preheader=f"{traveler_name} uploaded payment proof for {package_title} (Rs. {total_price:,.0f})",
        content_html=content_html,
        action_url=review_url,
        action_text="Review & Verify Payment →",
    )


def render_traveler_booking_approved_email(
    booking_id: str,
    traveler_name: str,
    package_title: str,
    destination: str,
    travelers: int,
    total_price: float,
    organizer_name: str,
    group_chat_url: str = "http://localhost:5173/my-trips",
) -> str:
    """Email sent to Traveler when Organizer approves their payment/booking with direct Group Chat link."""
    content_html = f"""
    <!-- Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        🎉 Booking Verified &amp; Confirmed
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      You're Going to {destination}!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{traveler_name}</strong>, your payment for <strong>{package_title}</strong> has been verified by <strong>{organizer_name}</strong>. Your spot in the expedition group is locked in!
    </p>

    <!-- Specs Grid Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Expedition</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">🏔 {package_title}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Host Organizer</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">🏷 {organizer_name}</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Travelers</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">👥 {travelers} Person{'' if travelers == 1 else 's'}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Total Paid</div>
          <div style="font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px;">Rs. {total_price:,.0f}</div>
        </td>
      </tr>
    </table>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #166534; text-align: center;">
      💬 <strong>Private Expedition Group Chat:</strong> Connect with your host organizer and fellow travelers before departure.
    </div>
    """

    return _get_base_layout(
        title=f"Booking Confirmed — {package_title}",
        preheader=f"Your booking for {package_title} is confirmed. Join the group chat!",
        content_html=content_html,
        action_url=group_chat_url,
        action_text="Join Expedition Group Chat →",
    )


def render_organizer_package_published_email(
    package_id: str,
    organizer_name: str,
    package_title: str,
    destination: str,
    duration_days: int,
    price_per_person: float,
    package_url: str = "http://localhost:5173/packages",
) -> str:
    """Branded notification email sent to Organizer when they publish a tour package."""
    content_html = f"""
    <!-- Badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        🚀 Tour Package Live on Marketplace
      </span>
    </div>

    <!-- Heading -->
    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      {package_title}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{organizer_name}</strong>, your tour package for <strong>{destination}</strong> is now live and accepting traveler bookings on Friday.
    </p>

    <!-- Specs Grid Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Duration</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">⏱️ {duration_days} Days</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Price per Person</div>
          <div style="font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px;">Rs. {price_per_person:,.0f}</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Destination</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">🏔️ {destination}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">Verified Status</div>
          <div style="font-size: 15px; font-weight: 600; color: #047857; margin-top: 2px;">✓ Verified Host</div>
        </td>
      </tr>
    </table>
    """

    return _get_base_layout(
        title=f"Package Published — {package_title}",
        preheader=f"{package_title} is live on Friday Marketplace!",
        content_html=content_html,
        action_url=package_url,
        action_text="View Live Package Listing →",
    )


def render_organizer_payment_uploaded_email(
    booking_id: str,
    organizer_name: str,
    traveler_name: str,
    traveler_phone: str,
    package_title: str,
    destination: str,
    travelers: int,
    total_price: float,
    review_url: str = "http://localhost:5173/organizer/bookings",
) -> str:
    """Branded email template notifying organizer that a traveler uploaded payment proof."""
    content_html = f"""
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        💳 Payment Proof Uploaded
      </span>
    </div>

    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      Payment Uploaded for {package_title}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{organizer_name}</strong>, traveler <strong>{traveler_name}</strong> has submitted payment proof for booking #{booking_id[:8].upper()}.
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">Traveler</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">{traveler_name}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">Total Paid</div>
          <div style="font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px;">Rs. {total_price:,.0f}</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">Seats</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">{travelers} Person(s)</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">Phone / WhatsApp</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">{traveler_phone or 'Available on Dashboard'}</div>
        </td>
      </tr>
    </table>
    """
    return _get_base_layout(
        title=f"Payment Proof Uploaded — #{booking_id[:8].upper()}",
        preheader=f"{traveler_name} uploaded payment proof for {package_title}",
        content_html=content_html,
        action_url=review_url,
        action_text="Verify Payment on Organizer Portal →",
    )


def render_traveler_booking_approved_email(
    booking_id: str,
    traveler_name: str,
    package_title: str,
    destination: str,
    travelers: int,
    total_price: float,
    organizer_name: str,
    group_chat_url: str = "http://localhost:5173/my-trips",
) -> str:
    """Branded email template notifying traveler that payment was verified and booking confirmed."""
    content_html = f"""
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px;">
        ✓ Payment Verified & Booking Confirmed
      </span>
    </div>

    <h1 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 400; color: #0a0a0a; text-align: center; line-height: 1.2;">
      You are confirmed for {package_title}!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hello <strong>{traveler_name}</strong>, your payment has been verified by <strong>{organizer_name}</strong>. Your spot is officially secured!
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">Destination</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">🏔️ {destination}</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">Total Paid</div>
          <div style="font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px;">Rs. {total_price:,.0f}</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">Reserved Seats</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">{travelers} Person(s)</div>
        </td>
        <td width="50%" valign="top" style="padding: 8px 12px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">Host Organizer</div>
          <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">{organizer_name}</div>
        </td>
      </tr>
    </table>
    """
    return _get_base_layout(
        title=f"Booking Confirmed — {package_title}",
        preheader=f"Your booking for {package_title} is confirmed!",
        content_html=content_html,
        action_url=group_chat_url,
        action_text="Open Expedition Group Chat →",
    )
