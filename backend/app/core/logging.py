"""Structured logging configuration with automatic secret key masking."""

import logging
import sys
import re
from app.core.config import get_settings

# Regex pattern matching common secret key formats
SECRET_PATTERNS = [
    re.compile(r'gsk_[a-zA-Z0-9_-]{20,}'),
    re.compile(r'AIzaSy[a-zA-Z0-9_-]{30,}'),
    re.compile(r'tvly-[a-zA-Z0-9_-]{20,}'),
    re.compile(r're_[a-zA-Z0-9_-]{20,}'),
    re.compile(r'lsv2_[a-zA-Z0-9_-]{20,}'),
]


class SecretMaskingFormatter(logging.Formatter):
    """Logging formatter that redacts sensitive API keys and tokens from all log messages."""

    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pattern in SECRET_PATTERNS:
            msg = pattern.sub('[REDACTED_SECRET]', msg)
        return msg


def setup_logging() -> logging.Logger:
    """Configure structured logging with secret masking."""
    settings = get_settings()
    level = logging.DEBUG if settings.DEBUG else logging.INFO

    formatter = SecretMaskingFormatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    logger = logging.getLogger("friday")
    logger.setLevel(level)
    # Remove existing handlers to avoid duplicates on reloads
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False

    return logger


def get_logger(name: str) -> logging.Logger:
    """Get a child logger."""
    return logging.getLogger(f"friday.{name}")
