"""Package model."""

from sqlalchemy import Column, String, Integer, Float, JSON, Text, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from app.database.base import Base, IDMixin, TimestampMixin


class Package(Base, IDMixin, TimestampMixin):
    __tablename__ = "packages"
    __table_args__ = (
        Index("ix_packages_org_active", "organizer_id", "is_active"),
    )

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
    # Dates and contact transparency
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    organizer_name = Column(String, nullable=True)
    rating = Column(Float, default=0.0)
    reviews_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)

    # Cloudinary image support
    image_url = Column(String, nullable=True)
    gallery_urls = Column(JSON, default=list)

    organizer = relationship("Organizer", back_populates="packages")


class PackageView(Base, IDMixin, TimestampMixin):
    __tablename__ = "package_views"

    package_id = Column(String, ForeignKey("packages.id"), nullable=False, index=True)
    visitor_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=True, index=True)
