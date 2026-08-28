"""Organizer model."""

from sqlalchemy import Column, String, Float, Integer, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, IDMixin, TimestampMixin


class Organizer(Base, IDMixin, TimestampMixin):
    __tablename__ = "organizers"

    user_id = Column(String, nullable=True, index=True)  # linked user account (optional)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    verification_status = Column(String, default="PENDING")  # PENDING, VERIFIED, REJECTED
    is_verified = Column(Boolean, default=False)
    destinations = Column(JSON, default=list)  # list of destination names
    rating = Column(Float, default=0.0)
    reviews_count = Column(Integer, default=0)
    location = Column(String, nullable=True)
    website = Column(String, nullable=True)

    # Business & Capacity (onboarding fields)
    number_of_buses = Column(Integer, nullable=True)
    vehicle_capacity = Column(Integer, nullable=True)
    maximum_group_size = Column(Integer, nullable=True)
    experience_years = Column(Integer, nullable=True)
    experience_description = Column(Text, nullable=True)
    onboarding_completed = Column(Boolean, default=False)

    # Payment Information
    payment_account_title = Column(String, nullable=True)
    payment_account_number = Column(String, nullable=True)
    payment_bank_name = Column(String, nullable=True)
    payment_instructions = Column(Text, nullable=True)

    packages = relationship("Package", back_populates="organizer", lazy="selectin")
