"""Budget model."""

from sqlalchemy import Column, String, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum

from app.database.base import Base, IDMixin, TimestampMixin


class BudgetCategory(str, enum.Enum):
    TRANSPORTATION = "TRANSPORTATION"
    ACCOMMODATION = "ACCOMMODATION"
    FOOD = "FOOD"
    ACTIVITIES = "ACTIVITIES"
    MISCELLANEOUS = "MISCELLANEOUS"


class Budget(Base, IDMixin, TimestampMixin):
    __tablename__ = "budgets"

    trip_id = Column(String, ForeignKey("trips.id"), nullable=False, index=True)
    category = Column(SAEnum(BudgetCategory), nullable=False)
    estimated_amount = Column(Float, default=0)
    actual_amount = Column(Float, default=0)
    notes = Column(String, nullable=True)
    version = Column(String, default="1")

    trip = relationship("Trip", back_populates="budgets")
