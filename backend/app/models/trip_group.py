"""Trip Group and Group Messages model for Organizer-operated trips."""

from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database.base import Base, IDMixin, TimestampMixin


class GroupMemberRole(str, enum.Enum):
    ORGANIZER = "ORGANIZER"
    TRAVELER = "TRAVELER"


class TripGroup(Base, IDMixin, TimestampMixin):
    """A private group community for an organizer's specific published package."""
    __tablename__ = "trip_groups"

    package_id = Column(String, ForeignKey("packages.id"), nullable=False, unique=True, index=True)
    organizer_id = Column(String, ForeignKey("organizers.id"), nullable=False, index=True)
    title = Column(String, nullable=False)

    members = relationship("TripGroupMember", back_populates="group", cascade="all, delete-orphan", lazy="selectin")
    messages = relationship("TripGroupMessage", back_populates="group", cascade="all, delete-orphan", lazy="selectin")
    package = relationship("Package", lazy="selectin")
    organizer = relationship("Organizer", lazy="selectin")


class TripGroupMember(Base, IDMixin):
    """Enrolled members of the trip group (Organizer and confirmed travelers only)."""
    __tablename__ = "trip_group_members"

    group_id = Column(String, ForeignKey("trip_groups.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(SAEnum(GroupMemberRole), default=GroupMemberRole.TRAVELER, nullable=False)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    group = relationship("TripGroup", back_populates="members")
    user = relationship("User", lazy="selectin")


class TripGroupMessage(Base, IDMixin):
    """Chronological messages exchanged within the trip group."""
    __tablename__ = "trip_group_messages"

    group_id = Column(String, ForeignKey("trip_groups.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    sender_name = Column(String, nullable=False)
    sender_role = Column(String, default="TRAVELER", nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    group = relationship("TripGroup", back_populates="messages")
    sender = relationship("User", lazy="selectin")
