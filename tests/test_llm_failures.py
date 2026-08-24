"""Tests for LLM router primary execution, fallback mechanics, and failure modes."""

import pytest
from unittest.mock import AsyncMock, patch
from app.llm.base import TaskType, LLMResponse
from app.llm.router import LLMRouter
from app.core.exceptions import LLMError


def test_llm_primary_success(run_async):
    """When primary provider succeeds, fallback is not invoked."""
    async def _test():
        router = LLMRouter()
        router.groq = AsyncMock()
        router.groq.generate_text.return_value = LLMResponse(
            text="Primary success response",
            model="openai/gpt-oss-20b",
            provider="groq",
        )
        router.gemini = AsyncMock()

        res = await router.generate_text(task=TaskType.EXTRACTION, prompt="Extract Hunza")
        assert res.text == "Primary success response"
        assert res.provider == "groq"
        router.gemini.generate_text.assert_not_called()

    run_async(_test())


def test_llm_primary_fails_fallback_succeeds(run_async):
    """When primary fails, fallback provider handles the request seamlessly."""
    async def _test():
        router = LLMRouter()
        router.groq = AsyncMock()
        router.groq.generate_text.side_effect = RuntimeError("Groq 503 Overloaded")

        router.gemini = AsyncMock()
        router.gemini.generate_text.return_value = LLMResponse(
            text="Gemini fallback response",
            model="gemini-2.5-flash",
            provider="gemini",
        )

        res = await router.generate_text(task=TaskType.EXTRACTION, prompt="Extract Swat")
        assert res.text == "Gemini fallback response"
        assert res.provider == "gemini"
        router.gemini.generate_text.assert_called_once()

    run_async(_test())


def test_llm_both_fail_raises_llm_error(run_async):
    """When both primary and fallback fail, a clean LLMError is raised without fabrication."""
    async def _test():
        router = LLMRouter()
        router.groq = AsyncMock()
        router.groq.generate_text.side_effect = RuntimeError("Groq down")

        router.gemini = AsyncMock()
        router.gemini.generate_text.side_effect = RuntimeError("Gemini down")

        with pytest.raises(LLMError) as exc_info:
            await router.generate_text(task=TaskType.PLANNING, prompt="Plan Hunza trip")

        assert "unavailable" in str(exc_info.value.message).lower()

    run_async(_test())


def test_llm_structured_fallback(run_async):
    """Structured generation triggers fallback on primary failure."""
    async def _test():
        router = LLMRouter()
        router.gemini = AsyncMock()
        router.gemini.generate_structured.side_effect = RuntimeError("Gemini schema error")

        router.groq = AsyncMock()
        router.groq.generate_structured.return_value = {"destination": "Skardu", "duration": 5}

        res = await router.generate_structured(
            task=TaskType.PLANNING,
            prompt="Generate Skardu JSON",
            response_schema={"type": "object"},
        )
        assert res["destination"] == "Skardu"
        assert res["duration"] == 5

    run_async(_test())


def test_llm_structured_both_fail_raises(run_async):
    """When structured generation fails across all providers, raise LLMError."""
    async def _test():
        router = LLMRouter()
        router.gemini = AsyncMock()
        router.gemini.generate_structured.side_effect = RuntimeError("Gemini fail")
        router.groq = AsyncMock()
        router.groq.generate_structured.side_effect = RuntimeError("Groq fail")

        with pytest.raises(LLMError):
            await router.generate_structured(
                task=TaskType.PLANNING,
                prompt="Generate JSON",
                response_schema={},
            )

    run_async(_test())
