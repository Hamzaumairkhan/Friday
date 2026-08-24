"""Email tool using Resend for booking requests and organizer notifications with explicit source transparency."""

from typing import Dict, Any, Optional, List
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("tools.email")
settings = get_settings()


class BaseEmailProvider:
    """Base interface for sending emails."""

    async def send(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        raise NotImplementedError


class ResendEmailProvider(BaseEmailProvider):
    """Resend live email provider integration."""

    def __init__(self, api_key: str, from_email: str, admin_email: Optional[str] = None):
        self.api_key = api_key
        self.from_email = from_email
        self.admin_email = admin_email or settings.ADMIN_EMAIL

    async def send(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        if not to or not to.strip():
            return {
                "success": False,
                "source": "resend",
                "source_type": "invalid_input",
                "data": None,
                "error": "Recipient email cannot be empty.",
            }

        try:
            import resend
            resend.api_key = self.api_key

            target_to = to
            # In development/test mode, if admin_email is configured, ensure delivery
            if self.admin_email and ("example.com" in to or "friday.pk" in to):
                target_to = self.admin_email

            params = {
                "from": self.from_email,
                "to": [target_to],
                "subject": subject,
                "html": f"<div style='font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;'><pre style='font-family: inherit; white-space: pre-wrap;'>{body}</pre></div>",
                "text": body,
            }
            response = resend.Emails.send(params)
            email_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", "email-resend-id")

            logger.info(f"Resend live email sent successfully to {target_to}. ID: {email_id}")
            return {
                "success": True,
                "source": "resend",
                "source_type": "live",
                "data": {
                    "id": email_id,
                    "to": target_to,
                    "subject": subject,
                },
                "error": None,
            }
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {e}")
            return {
                "success": False,
                "source": "resend",
                "source_type": "live",
                "data": None,
                "error": f"Resend API error: {str(e)}",
            }


class UnconfiguredEmailProvider(BaseEmailProvider):
    """Honest unconfigured email provider returning unavailable status."""

    async def send(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        logger.warning(f"Email dispatch attempted to {to} but RESEND_API_KEY is not configured.")
        return {
            "success": False,
            "source": "resend",
            "source_type": "unavailable",
            "data": None,
            "error": "Resend API key is not configured in the environment.",
        }


class MockEmailProvider(BaseEmailProvider):
    """Mock email provider strictly for automated test suites."""

    async def send(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        import uuid
        logger.info(f"[TEST EMAIL DISPATCH] To: {to} | Subject: {subject}")
        return {
            "success": True,
            "source": "test_email_fixture",
            "source_type": "test_fixture",
            "data": {
                "id": f"test-email-{uuid.uuid4().hex[:8]}",
                "to": to,
                "subject": subject,
                "preview": body[:120],
            },
            "error": None,
        }


class EmailTool:
    """Unified email tool used by booking and notification services with source transparency."""

    def __init__(self, api_key: Optional[str] = None, from_email: Optional[str] = None, admin_email: Optional[str] = None):
        self.api_key = api_key or settings.RESEND_API_KEY
        self.from_email = from_email or settings.EMAIL_FROM
        self.admin_email = admin_email or settings.ADMIN_EMAIL
        if self.api_key:
            self.provider: BaseEmailProvider = ResendEmailProvider(api_key=self.api_key, from_email=self.from_email, admin_email=self.admin_email)
        else:
            self.provider = UnconfiguredEmailProvider()

    async def send_email(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        """Send an email to organizer or traveler."""
        return await self.provider.send(to=to, subject=subject, body=body)


async def send_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """Convenience functional wrapper for email tool."""
    tool = EmailTool()
    return await tool.send_email(to=to, subject=subject, body=body)
