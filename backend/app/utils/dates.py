"""Date and time utility functions."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


def format_date(dt: datetime) -> str:
    """Format datetime as ISO 8601 string."""
    return dt.isoformat()


def days_between(start: datetime, end: datetime) -> int:
    """Calculate days between two dates."""
    return (end.date() - start.date()).days
