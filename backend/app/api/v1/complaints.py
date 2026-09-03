"""User-Facing Issue & Complaint Reporting Router for Friday Travel Copilot."""

import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.config import get_settings
from app.core.logging import get_logger
from app.tools.email import EmailTool

logger = get_logger("api.v1.complaints")
settings = get_settings()

router = APIRouter(prefix="/complaints", tags=["Complaints & Reports"])


class ComplaintCreate(BaseModel):
    issue_type: str = Field(..., description="Category: Email, WhatsApp, Loading, Mobile, Booking, Trip, Auth, Other")
    page_feature: str = Field("General", description="Page or UI feature where the issue happened")
    description: str = Field(..., min_length=5, max_length=2000, description="Detailed problem description")
    contact_email: Optional[str] = Field(None, description="Optional contact email for follow-up")
    user_id: Optional[str] = Field(None, description="Optional user ID")
    device_info: Optional[str] = Field(None, description="User agent or device details")


async def _send_complaint_email(report_id: str, payload: ComplaintCreate, reported_at: str):
    """Background task sending formatted issue alert to support/admin via direct Gmail SMTP."""
    admin_to = settings.ADMIN_EMAIL or "hamzaumairkhan30@gmail.com"
    subject = f"🚨 [Friday Issue Report] {payload.issue_type} - {payload.page_feature}"
    
    plain_body = f"""FRIDAY ISSUE REPORT #{report_id}
=======================================
Issue Type:   {payload.issue_type}
Page/Feature: {payload.page_feature}
Reported At:  {reported_at}
Contact:      {payload.contact_email or 'Anonymous User'}
User ID:      {payload.user_id or 'N/A'}
Device/Agent: {payload.device_info or 'N/A'}

DESCRIPTION:
{payload.description}
=======================================
"""

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="background-color: #00261D; color: #ffffff; padding: 18px 24px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 20px;">Friday Issue Report <span style="font-size: 13px; opacity: 0.8;">#{report_id}</span></h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #BBEAD5;">User-submitted issue via in-app report modal</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">Category</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;"><span style="background-color: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 12px;">{payload.issue_type}</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Page / Feature</td>
                <td style="padding: 8px 0; color: #0f172a;">{payload.page_feature}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Contact Email</td>
                <td style="padding: 8px 0; color: #0f172a;">{payload.contact_email or 'Not provided'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Timestamp</td>
                <td style="padding: 8px 0; color: #0f172a;">{reported_at}</td>
            </tr>
            {f'<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Device / Viewport</td><td style="padding: 8px 0; color: #0f172a;">{payload.device_info}</td></tr>' if payload.device_info else ''}
        </table>

        <div style="background-color: #f8fafc; border-left: 4px solid #00261D; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px; color: #0f172a; font-size: 13px;">User Description:</h4>
            <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{payload.description}</p>
        </div>

        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            Friday Travel Copilot &bull; Automated Issue Dispatch System
        </p>
    </div>
    """

    try:
        email_tool = EmailTool()
        await email_tool.send_email(to=admin_to, subject=subject, body=plain_body, html=html_body)
        logger.info(f"Complaint report #{report_id} emailed to admin ({admin_to}) successfully.")
    except Exception as e:
        logger.error(f"Failed to email complaint report #{report_id}: {e}")


@router.post("")
async def create_complaint(
    payload: ComplaintCreate,
    background_tasks: BackgroundTasks,
):
    """Submit a user complaint / bug report with instant admin notification."""
    report_id = f"cmp_{uuid.uuid4().hex[:8]}"
    reported_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    logger.info(
        f"New issue report [{report_id}]: {payload.issue_type} at {payload.page_feature} "
        f"from {payload.contact_email or 'anonymous'}"
    )

    # Dispatch email notification in background to avoid blocking user response
    background_tasks.add_task(_send_complaint_email, report_id, payload, reported_at)

    return {
        "success": True,
        "report_id": report_id,
        "message": "Thank you for reporting. Your issue has been logged and sent to our engineering team.",
        "reported_at": reported_at,
    }
