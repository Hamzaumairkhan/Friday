"""SQLAlchemy base model with common columns."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import DeclarativeBase

from app.utils.helpers import generate_id


class Base(DeclarativeBase):
    """Declarative base for all SQLAlchemy models."""
    pass


class TimestampMixin:
    """Mixin that adds created_at and updated_at columns."""

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class IDMixin:
    """Mixin that adds a UUID primary key."""

    id = Column(String, primary_key=True, default=generate_id)
