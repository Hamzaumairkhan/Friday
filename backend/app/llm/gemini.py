"""Google Gemini LLM provider implementation with header-based authorization."""

import json
import time
from typing import Dict, Any, Optional
import httpx
from app.llm.base import BaseLLMProvider, LLMResponse
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("llm.gemini")
settings = get_settings()


class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider for complex reasoning, planning, and replanning."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GOOGLE_API_KEY
        self.model_name = model or settings.GEMINI_MODEL or "gemini-2.5-flash"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        if not self.api_key:
            raise RuntimeError("Gemini API key is not configured.")

        # Header-based auth avoids leaking API key in URL logs
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        
        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"System Instructions: {system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will follow these instructions."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
            },
        }
        if max_tokens:
            payload["generationConfig"]["maxOutputTokens"] = max_tokens

        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code != 200:
                clean_err = resp.text.replace(self.api_key, "[REDACTED_API_KEY]")
                logger.error(f"Gemini API error (HTTP {resp.status_code}) after {latency_ms}ms: {clean_err}")
                raise RuntimeError(f"Gemini API error (HTTP {resp.status_code})")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("Gemini returned no candidates.")

            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return LLMResponse(
                text=text,
                model=self.model_name,
                provider="gemini",
            )

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("Gemini API key is not configured.")

        schema_instruction = f"You MUST respond ONLY with a valid JSON object strictly matching this schema: {json.dumps(response_schema)}"
        combined_system = f"{system_prompt}\n{schema_instruction}" if system_prompt else schema_instruction

        res = await self.generate_text(
            prompt=prompt,
            system_prompt=combined_system,
            temperature=0.2,
        )

        clean_text = res.text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text.replace("```json", "").replace("```", "").strip()
        elif clean_text.startswith("```"):
            clean_text = clean_text.replace("```", "").strip()

        return json.loads(clean_text)
