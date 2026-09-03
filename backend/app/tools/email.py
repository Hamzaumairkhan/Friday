"""Email tool using Resend for booking requests and organizer notifications with explicit source transparency."""

from typing import Dict, Any, Optional, List
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("tools.email")
settings = get_settings()


class BaseEmailProvider:
    """Base interface for sending emails."""

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError


class ResendEmailProvider(BaseEmailProvider):
    """Resend live email provider integration."""

    def __init__(self, api_key: str, from_email: str, admin_email: Optional[str] = None):
        self.api_key = api_key
        self.from_email = from_email
        self.admin_email = admin_email or settings.ADMIN_EMAIL

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
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

            target_to = to.strip()
            from_addr = self.from_email
            if not from_addr or "@gmail.com" in from_addr or "todaysfriday" in from_addr:
                from_addr = "Friday Travel Copilot <onboarding@resend.dev>"

            params = {
                "from": from_addr,
                "to": [target_to],
                "subject": subject,
                "html": html or f"<div style='font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;'>{body}</div>",
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

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
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

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
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


class SmtpEmailProvider(BaseEmailProvider):
    """Direct SMTP email provider (Gmail SMTP with dual-port 587 STARTTLS and 465 SSL resilience)."""

    def __init__(self, host: str, port: int, user: str, password: str, from_email: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.from_email = from_email

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        import smtplib
        import asyncio
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        if not to or not to.strip():
            return {"success": False, "source": "smtp", "source_type": "invalid_input", "data": None, "error": "Recipient email cannot be empty."}

        target_to = to.strip()

        def _send_sync():
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Friday Travel Marketplace <{self.from_email}>"
            msg["To"] = target_to

            msg.attach(MIMEText(body, "plain", "utf-8"))
            if html:
                msg.attach(MIMEText(html, "html", "utf-8"))

            # 1. Primary: Port 465 with SSL (Instant encrypted connection, avoids cloud port 587 throttle)
            try:
                with smtplib.SMTP_SSL(self.host, 465, timeout=5.0) as server:
                    server.login(self.user, self.password)
                    server.sendmail(self.from_email, [target_to], msg.as_string())
                return True
            except Exception as e465:
                logger.warning(f"SMTP port 465 SSL dispatch failed ({e465}), trying port 587 STARTTLS...")

            # 2. Fallback: Port 587 with STARTTLS
            with smtplib.SMTP(self.host, self.port or 587, timeout=5.0) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.from_email, [target_to], msg.as_string())
            return True

        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _send_sync)
            logger.info(f"Direct Gmail SMTP email delivered successfully to {target_to}")
            return {"success": True, "source": "smtp", "source_type": "live", "data": {"to": target_to, "subject": subject}, "error": None}
        except Exception as e:
            logger.error(f"Gmail SMTP delivery failed: {e}")
            return {"success": False, "source": "smtp", "source_type": "live", "data": None, "error": f"SMTP error: {e}"}


class EmailTool:
    """Unified email tool using direct Gmail SMTP exclusively as configured by user."""

    def __init__(self, api_key: Optional[str] = None, from_email: Optional[str] = None, admin_email: Optional[str] = None):
        self.from_email = from_email or settings.EMAIL_FROM or settings.SMTP_USER or "todaysfriday555@gmail.com"
        self.admin_email = admin_email or settings.ADMIN_EMAIL

        # Authoritative direct Gmail SMTP provider
        self.smtp_provider: Optional[SmtpEmailProvider] = (
            SmtpEmailProvider(
                host=settings.SMTP_HOST or "smtp.gmail.com",
                port=settings.SMTP_PORT or 587,
                user=settings.SMTP_USER or "todaysfriday555@gmail.com",
                password=settings.SMTP_PASSWORD or "ajif ktyg semf bbqi",
                from_email=self.from_email,
            )
        )

    async def send_email(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        """Send an email using direct Gmail SMTP."""
        if self.smtp_provider:
            return await self.smtp_provider.send(to=to, subject=subject, body=body, html=html)

        return {
            "success": False,
            "source": "unconfigured",
            "source_type": "unavailable",
            "data": None,
            "error": "No SMTP credentials configured.",
        }


async def send_email(to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
    """Convenience functional wrapper for email tool."""
    tool = EmailTool()
    return await tool.send_email(to=to, subject=subject, body=body, html=html)
