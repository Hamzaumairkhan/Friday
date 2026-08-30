"""Booking model with immutable package & organizer snapshot persistence."""

from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum

from app.database.base import Base, IDMixin, TimestampMixin


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROOF_UPLOADED = "PROOF_UPLOADED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class Booking(Base, IDMixin, TimestampMixin):
    __tablename__ = "bookings"

    trip_id = Column(String, ForeignKey("trips.id"), nullable=False, index=True)
    package_id = Column(String, ForeignKey("packages.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    organizer_id = Column(String, ForeignKey("organizers.id"), nullable=False, index=True)
    travelers = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False)
    notes = Column(Text, nullable=True)

    # Immutable Snapshot Fields (Persisted at booking creation time)
    package_title = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    duration_days = Column(Integer, nullable=True)
    price_per_person = Column(Float, nullable=True)
    organizer_name = Column(String, nullable=True)
    traveler_name = Column(String, nullable=True)
    traveler_email = Column(String, nullable=True)
    traveler_phone = Column(String, nullable=True)

    # Payment Proof Fields
    payment_status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_proof_url = Column(Text, nullable=True)
    payment_uploaded_at = Column(DateTime(timezone=True), nullable=True)
    payment_verified_at = Column(DateTime(timezone=True), nullable=True)
    payment_verified_by = Column(String, nullable=True)
    payment_rejection_reason = Column(Text, nullable=True)

    trip = relationship("Trip", back_populates="bookings")
    package = relationship("Package")
