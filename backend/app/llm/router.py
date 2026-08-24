"""Intelligent LLM Router with Task-Based Dispatch, Latency Logging, and Automatic Fallback."""

import time
from typing import Dict, Any, Optional, Tuple
from app.llm.base import BaseLLMProvider, LLMResponse, TaskType
from app.llm.gemini import GeminiProvider
from app.llm.groq import GroqProvider
from app.core.exceptions import LLMError
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("llm.router")
settings = get_settings()


class LLMRouter:
    """Intelligent router selecting the best model (Gemini vs Groq) based on task complexity with automatic fallback."""

    def __init__(self):
        self.gemini = GeminiProvider()
        self.groq = GroqProvider()

    def _get_primary_and_fallback(self, task: TaskType) -> Tuple[BaseLLMProvider, BaseLLMProvider, str, str]:
        """Determine primary and secondary LLM providers for the given task."""
        if task in (TaskType.PLANNING, TaskType.REPLANNING, TaskType.REASONING):
            return self.gemini, self.groq, "gemini", "groq"
        else:
            # Extraction, Classification, General Chat
            return self.groq, self.gemini, "groq", "gemini"

    async def generate_text(
        self,
        task: TaskType,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        primary, fallback, primary_name, fallback_name = self._get_primary_and_fallback(task)

        # 1. Attempt primary provider
        start_time = time.perf_counter()
        try:
            res = await primary.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)
            logger.info(f"LLM [{task.value}] success via primary={primary_name} ({elapsed_ms}ms)")
            return res
        except Exception as e_primary:
            elapsed_primary_ms = round((time.perf_counter() - start_time) * 1000, 1)
            logger.warning(
                f"LLM [{task.value}] primary={primary_name} failed after {elapsed_primary_ms}ms: {e_primary}. Attempting fallback={fallback_name}..."
            )

        # 2. Attempt fallback provider
        start_fallback = time.perf_counter()
        try:
            res = await fallback.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            elapsed_fb_ms = round((time.perf_counter() - start_fallback) * 1000, 1)
            logger.info(f"LLM [{task.value}] success via fallback={fallback_name} ({elapsed_fb_ms}ms)")
            return res
        except Exception as e_fallback:
            elapsed_total_ms = round((time.perf_counter() - start_time) * 1000, 1)
            logger.error(
                f"LLM [{task.value}] ALL providers failed after {elapsed_total_ms}ms. Primary={primary_name}, Fallback={fallback_name}: {e_fallback}"
            )
            raise LLMError(
                provider=f"{primary_name}+{fallback_name}",
                message=f"All LLM providers unavailable for task '{task.value}'.",
            )

    async def generate_structured(
        self,
        task: TaskType,
        prompt: str,
        response_schema: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        primary, fallback, primary_name, fallback_name = self._get_primary_and_fallback(task)

        # 1. Attempt primary provider
        start_time = time.perf_counter()
        try:
            res = await primary.generate_structured(
                prompt=prompt,
                response_schema=response_schema,
                system_prompt=system_prompt,
            )
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)
            logger.info(f"LLM structured [{task.value}] success via primary={primary_name} ({elapsed_ms}ms)")
            return res
        except Exception as e_primary:
            elapsed_primary_ms = round((time.perf_counter() - start_time) * 1000, 1)
            logger.warning(
                f"LLM structured [{task.value}] primary={primary_name} failed after {elapsed_primary_ms}ms: {e_primary}. Attempting fallback={fallback_name}..."
            )

        # 2. Attempt fallback provider
        start_fallback = time.perf_counter()
        try:
            res = await fallback.generate_structured(
                prompt=prompt,
                response_schema=response_schema,
                system_prompt=system_prompt,
            )
            elapsed_fb_ms = round((time.perf_counter() - start_fallback) * 1000, 1)
            logger.info(f"LLM structured [{task.value}] success via fallback={fallback_name} ({elapsed_fb_ms}ms)")
            return res
        except Exception as e_fallback:
            elapsed_total_ms = round((time.perf_counter() - start_time) * 1000, 1)
            logger.error(
                f"LLM structured [{task.value}] ALL providers failed after {elapsed_total_ms}ms: {e_fallback}"
            )
            raise LLMError(
                provider=f"{primary_name}+{fallback_name}",
                message=f"All structured LLM providers unavailable for task '{task.value}'.",
            )


_global_llm_router: Optional[LLMRouter] = None


def get_llm_router() -> LLMRouter:
    """Get singleton instance of the LLM router."""
    global _global_llm_router
    if _global_llm_router is None:
        _global_llm_router = LLMRouter()
    return _global_llm_router
