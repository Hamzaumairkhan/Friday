"""Groq LLM provider implementation with error sanitization and latency tracking."""

import json
import time
from typing import Dict, Any, Optional
import httpx
from app.llm.base import BaseLLMProvider, LLMResponse
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("llm.groq")
settings = get_settings()


class GroqProvider(BaseLLMProvider):
    """Groq provider for ultra-fast conversational extraction and lightweight tasks."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model_name = model or settings.GROQ_MODEL or "openai/gpt-oss-20b"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.5,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        if not self.api_key:
            raise RuntimeError("Groq API key is not configured.")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code != 200:
                clean_err = resp.text.replace(self.api_key, "[REDACTED_API_KEY]")
                logger.error(f"Groq API error (HTTP {resp.status_code}) after {latency_ms}ms: {clean_err}")
                raise RuntimeError(f"Groq API error (HTTP {resp.status_code})")

            data = resp.json()
            choice = data["choices"][0]
            content = choice["message"]["content"]

            return LLMResponse(
                text=content,
                model=self.model_name,
                provider="groq",
                finish_reason=choice.get("finish_reason"),
            )

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("Groq API key is not configured.")

        messages = []
        schema_prompt = (
            f"You are a structured data extraction engine. "
            f"Respond ONLY with a valid JSON object strictly matching this schema: {json.dumps(response_schema)}. "
            f"Do NOT include explanations or markdown code fences."
        )
        full_system = f"{system_prompt}\n{schema_prompt}" if system_prompt else schema_prompt

        messages.append({"role": "system", "content": full_system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code != 200:
                clean_err = resp.text.replace(self.api_key, "[REDACTED_API_KEY]")
                logger.error(f"Groq structured generation error (HTTP {resp.status_code}) after {latency_ms}ms: {clean_err}")
                raise RuntimeError(f"Groq structured generation error (HTTP {resp.status_code})")

            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
