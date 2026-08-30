"""Review model."""

from sqlalchemy import Column, String, Float, Text, ForeignKey, Integer
from app.database.base import Base, IDMixin, TimestampMixin


class Review(Base, IDMixin, TimestampMixin):
    __tablename__ = "reviews"

    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    organizer_id = Column(String, ForeignKey("organizers.id"), nullable=False, index=True)
    package_id = Column(String, ForeignKey("packages.id"), nullable=True, index=True)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=True)
    rating = Column(Float, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    reviewer_name = Column(String, nullable=True)
