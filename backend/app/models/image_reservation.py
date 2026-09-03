"""Image Reservation model to guarantee global travel image uniqueness."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.database.database import Base


class ImageReservation(Base):
    """Registry tracking all claimed/assigned external travel image URLs to ensure global uniqueness."""
    __tablename__ = "image_reservations"

    image_url = Column(String(500), primary_key=True)
    entity_type = Column(String(32), nullable=False)  # 'trip', 'package'
    entity_id = Column(String(64), nullable=False, index=True)
    destination = Column(String(128), nullable=False, index=True)
    reserved_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ImageReservation(destination='{self.destination}', entity_type='{self.entity_type}', entity_id='{self.entity_id}')>"
