"""Tests for deterministic budget engine calculations."""

import pytest
from app.services.budget_service import BudgetService


def test_deterministic_budget_calculation():
    trip_id = "test-trip"
    total_budget_limit = 200000.0
    travelers = 5
    items = [
        {"category": "TRANSPORTATION", "estimated_amount": 50000.0, "actual_amount": 0.0},
        {"category": "ACCOMMODATION", "estimated_amount": 70000.0, "actual_amount": 0.0},
        {"category": "FOOD", "estimated_amount": 40000.0, "actual_amount": 0.0},
        {"category": "ACTIVITIES", "estimated_amount": 24000.0, "actual_amount": 0.0},
        {"category": "MISCELLANEOUS", "estimated_amount": 16000.0, "actual_amount": 0.0},
    ]

    summary = BudgetService.calculate_summary(
        trip_id=trip_id,
        total_budget_limit=total_budget_limit,
        budget_items=items,
        travelers=travelers,
    )

    assert summary.total_estimated == 200000.0
    assert summary.total_per_person == 40000.0
    assert summary.remaining == 0.0
    assert summary.over_budget is False


def test_over_budget_detection():
    trip_id = "test-trip"
    total_budget_limit = 100000.0
    items = [
        {"category": "TRANSPORTATION", "estimated_amount": 60000.0, "actual_amount": 0.0},
        {"category": "ACCOMMODATION", "estimated_amount": 50000.0, "actual_amount": 0.0},
    ]

    summary = BudgetService.calculate_summary(
        trip_id=trip_id,
        total_budget_limit=total_budget_limit,
        budget_items=items,
        travelers=2,
    )

    assert summary.total_estimated == 110000.0
    assert summary.over_budget is True
    assert summary.remaining == -10000.0
