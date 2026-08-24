"""Tests for security controls, secret masking, unauthorized rejection, and error sanitization."""

import pytest
import logging
from app.core.logging import SecretMaskingFormatter
from app.core.exceptions import FridayError, friday_error_handler
from fastapi import Request


def test_secret_masking_in_logs():
    """Verify SecretMaskingFormatter redacts live API keys from logs."""
    formatter = SecretMaskingFormatter(fmt="%(message)s")
    record = logging.LogRecord(
        name="friday.test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="Using Groq key gsk_1234567890abcdef1234567890 and Gemini AIzaSy1234567890abcdef123456789012345",
        args=(),
        exc_info=None,
    )
    formatted = formatter.format(record)
    assert "gsk_" not in formatted
    assert "AIzaSy" not in formatted
    assert "[REDACTED_SECRET]" in formatted


def test_friday_error_handler_sanitization(run_async):
    """Verify error handler strips API keys from user-facing JSON responses."""
    async def _test():
        class MockRequest:
            pass

        exc = FridayError("Call failed with key gsk_secret1234567890abcdef", status_code=500)
        resp = await friday_error_handler(MockRequest(), exc)
        import json
        body = json.loads(resp.body)
        assert "gsk_" not in body["message"]
        assert "redacted" in body["message"].lower()

    run_async(_test())
