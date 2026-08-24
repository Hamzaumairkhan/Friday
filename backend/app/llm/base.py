"""Base interfaces and data structures for LLM providers."""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from enum import Enum
from pydantic import BaseModel


class TaskType(str, Enum):
    """Classification of tasks for intelligent LLM routing."""
    EXTRACTION = "extraction"          # Fast slot extraction (Groq primary)
    CLASSIFICATION = "classification"  # Intent classification (Groq primary)
    PLANNING = "planning"              # Complex itinerary & trip planning (Gemini primary)
    REPLANNING = "replanning"          # Contextual & weather-aware replanning (Gemini primary)
    REASONING = "reasoning"            # Evidence synthesis & marketplace matching (Gemini primary)
    GENERAL_CHAT = "general_chat"      # Conversational response (Groq/Gemini)


class LLMResponse(BaseModel):
    text: str
    model: str
    provider: str
    structured_data: Optional[Dict[str, Any]] = None
    finish_reason: Optional[str] = None


class BaseLLMProvider(ABC):
    """Abstract interface for LLM provider implementations."""

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate text completion from prompt."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate structured JSON conforming to the given schema."""
        pass
