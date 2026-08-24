"""Budget schemas."""

from typing import Optional
from pydantic import BaseModel


class BudgetItemSchema(BaseModel):
    category: str
    estimated_amount: float = 0
    actual_amount: float = 0
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class BudgetSummary(BaseModel):
    trip_id: str
    total_estimated: float = 0
    total_per_person: float = 0
    remaining: float = 0
    over_budget: bool = False
    categories: list[BudgetItemSchema] = []
