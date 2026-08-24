"""Package model."""

from sqlalchemy import Column, String, Integer, Float, JSON, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.base import Base, IDMixin, TimestampMixin


class Package(Base, IDMixin, TimestampMixin):
    __tablename__ = "packages"

    organizer_id = Column(String, ForeignKey("organizers.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    duration_days = Column(Integer, nullable=False)
    price_per_person = Column(Float, nullable=False)
    max_travelers = Column(Integer, default=20)
    description = Column(Text, nullable=True)
    inclusions = Column(JSON, default=list)
    exclusions = Column(JSON, default=list)
    accommodation_type = Column(String, nullable=True)
    transportation_type = Column(String, nullable=True)
    activities = Column(JSON, default=list)  # list of activity names
    is_active = Column(Boolean, default=True)

    organizer = relationship("Organizer", back_populates="packages")
