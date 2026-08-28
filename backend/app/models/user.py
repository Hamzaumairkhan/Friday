"""User model."""

from sqlalchemy import Column, String, Boolean, Enum as SAEnum
import enum

from app.database.base import Base, IDMixin, TimestampMixin


class UserRole(str, enum.Enum):
    TRAVELER = "TRAVELER"
    ORGANIZER = "ORGANIZER"
    ADMIN = "ADMIN"


class User(Base, IDMixin, TimestampMixin):
    __tablename__ = "users"

    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, nullable=True)
    name = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.TRAVELER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
