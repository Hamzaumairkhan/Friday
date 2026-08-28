"""Itinerary, Day, and Activity models."""

from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum

from app.database.base import Base, IDMixin, TimestampMixin


class ActivityCategory(str, enum.Enum):
    SIGHTSEEING = "SIGHTSEEING"
    ADVENTURE = "ADVENTURE"
    FOOD = "FOOD"
    TRANSPORT = "TRANSPORT"
    ACCOMMODATION = "ACCOMMODATION"
    SHOPPING = "SHOPPING"
    CULTURE = "CULTURE"
    REST = "REST"
    OTHER = "OTHER"


class Itinerary(Base, IDMixin, TimestampMixin):
    __tablename__ = "itineraries"

    trip_id = Column(String, ForeignKey("trips.id"), nullable=False, unique=True, index=True)
    version = Column(Integer, default=1, nullable=False)
    notes = Column(Text, nullable=True)

    trip = relationship("Trip", back_populates="itinerary")
    days = relationship("Day", back_populates="itinerary", cascade="all, delete-orphan", order_by="Day.day_number")


class Day(Base, IDMixin, TimestampMixin):
    __tablename__ = "days"

    itinerary_id = Column(String, ForeignKey("itineraries.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    date = Column(String, nullable=True)
    title = Column(String, nullable=True)
    summary = Column(Text, nullable=True)

    itinerary = relationship("Itinerary", back_populates="days")
    activities = relationship("Activity", back_populates="day", cascade="all, delete-orphan", order_by="Activity.order")


class Activity(Base, IDMixin, TimestampMixin):
    __tablename__ = "activities"

    day_id = Column(String, ForeignKey("days.id"), nullable=False, index=True)
    order = Column(Integer, default=0, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    estimated_cost = Column(Float, default=0)
    category = Column(SAEnum(ActivityCategory), default=ActivityCategory.OTHER)
    travel_time_minutes = Column(Integer, nullable=True)
    confidence = Column(Float, default=0.8)
    image_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    day = relationship("Day", back_populates="activities")
