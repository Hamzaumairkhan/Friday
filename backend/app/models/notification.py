"""Notification model for in-app notifications."""

from sqlalchemy import Column, String, Text, Boolean, Enum as SAEnum
import enum

from app.database.base import Base, IDMixin, TimestampMixin


class NotificationType(str, enum.Enum):
    NEW_BOOKING = "NEW_BOOKING"
    PAYMENT_UPLOADED = "PAYMENT_UPLOADED"
    PAYMENT_VERIFIED = "PAYMENT_VERIFIED"
    PAYMENT_REJECTED = "PAYMENT_REJECTED"
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    BOOKING_REJECTED = "BOOKING_REJECTED"


class Notification(Base, IDMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id = Column(String, nullable=False, index=True)
    type = Column(SAEnum(NotificationType), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    related_booking_id = Column(String, nullable=True)
    related_trip_id = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
