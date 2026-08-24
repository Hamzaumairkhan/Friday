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

    packages = relationship("Package", back_populates="organizer", lazy="selectin")
