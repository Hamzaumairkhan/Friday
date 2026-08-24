"""Tests for LLM Dual-Engine Router and Provider Dispatch."""

import pytest
from app.llm.base import TaskType, LLMResponse
from app.llm.router import LLMRouter, get_llm_router
from app.llm.gemini import GeminiProvider
from app.llm.groq import GroqProvider


def test_llm_router_singleton():
    """Verify router singleton instance creation."""
    router1 = get_llm_router()
    router2 = get_llm_router()
    assert router1 is router2


def test_task_type_routing_assignments():
    """Verify appropriate provider assignment based on task complexity."""
    router = LLMRouter()

    # Complex reasoning & planning -> Gemini primary
    primary_plan, fallback_plan, p_name, fb_name = router._get_primary_and_fallback(TaskType.PLANNING)
    assert isinstance(primary_plan, GeminiProvider)
    assert isinstance(fallback_plan, GroqProvider)
    assert p_name == "gemini"
    assert fb_name == "groq"

    # Replanning -> Gemini primary
    primary_replan, fallback_replan, _, _ = router._get_primary_and_fallback(TaskType.REPLANNING)
    assert isinstance(primary_replan, GeminiProvider)
    assert isinstance(fallback_replan, GroqProvider)

    # Fast Extraction -> Groq primary
    primary_extract, fallback_extract, p_name_ext, fb_name_ext = router._get_primary_and_fallback(TaskType.EXTRACTION)
    assert isinstance(primary_extract, GroqProvider)
    assert isinstance(fallback_extract, GeminiProvider)
    assert p_name_ext == "groq"
    assert fb_name_ext == "gemini"

    # Intent Classification -> Groq primary
    primary_class, fallback_class, _, _ = router._get_primary_and_fallback(TaskType.CLASSIFICATION)
    assert isinstance(primary_class, GroqProvider)
    assert isinstance(fallback_class, GeminiProvider)
