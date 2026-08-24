"""Trip model."""

from sqlalchemy import Column, String, Integer, Float, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum

from app.database.base import Base, IDMixin, TimestampMixin


class TripStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PLANNING = "PLANNING"
    PLANNED = "PLANNED"
    BOOKED = "BOOKED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MemberRole(str, enum.Enum):
    OWNER = "OWNER"
    MEMBER = "MEMBER"


class Trip(Base, IDMixin, TimestampMixin):
    __tablename__ = "trips"

    owner_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    origin = Column(String, default="Islamabad")
    duration = Column(Integer, nullable=True)  # days
    travelers = Column(Integer, default=1)
    budget_total = Column(Float, nullable=True)
    budget_per_person = Column(Float, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    status = Column(SAEnum(TripStatus), default=TripStatus.DRAFT, nullable=False)
    preferences = Column(JSON, default=list)
    constraints = Column(JSON, default=list)
    version = Column(Integer, default=1, nullable=False)

    # Relationships
    members = relationship("TripMember", back_populates="trip", cascade="all, delete-orphan")
    itinerary = relationship("Itinerary", back_populates="trip", uselist=False, cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="trip", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="trip", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="trip", cascade="all, delete-orphan")


class TripMember(Base, IDMixin, TimestampMixin):
    __tablename__ = "trip_members"

    trip_id = Column(String, ForeignKey("trips.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(SAEnum(MemberRole), default=MemberRole.MEMBER, nullable=False)
    invitation_status = Column(String, default="ACCEPTED")  # PENDING, ACCEPTED, DECLINED

    trip = relationship("Trip", back_populates="members")
