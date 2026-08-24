"""Conversation agent utilizing Groq/Gemini LLMRouter with Pydantic structured output validation."""

import re
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

from app.llm.base import TaskType
from app.llm.router import get_llm_router
from app.core.logging import get_logger

logger = get_logger("agents.conversation")


class TripRequirements(BaseModel):
    """Pydantic validated travel requirement slots extracted from natural language."""
    destination: Optional[str] = Field(None, description="Target destination in Pakistan")
    origin: Optional[str] = Field("Islamabad", description="Departure city")
    duration_days: Optional[int] = Field(None, description="Number of trip days")
    travelers: Optional[int] = Field(None, description="Number of travelers")
    budget_per_person: Optional[float] = Field(None, description="Budget in PKR per person")
    preferences: List[str] = Field(default_factory=list, description="Travel preferences and activities")
    constraints: List[str] = Field(default_factory=list, description="Constraints or special requests")


class ConversationAgent:
    """Agent that extracts structured travel requirements from Roman Urdu / English queries."""

    def __init__(self):
        self.router = get_llm_router()

    def detect_intent(self, message: str) -> str:
        """Categorize user intent."""
        msg = message.lower()
        if any(w in msg for w in ["book", "booking", "reserve", "book karo", "booking kardo"]):
            return "book_organizer"
        if any(w in msg for w in ["organizer", "operator", "agency", "tour company", "find organizer"]):
            return "search_organizers"
        if any(w in msg for w in ["replan", "change", "budget kam", "budget barha", "kar do", "kardo", "budget 30k", "budget 25k"]):
            return "replan_budget"
        if any(w in msg for w in ["jana hai", "trip", "plan", "tour", "visit", "ghoomne", "days", "din", "expedition", "getaway"]):
            return "plan_trip"
        return "general_chat"

    def _regex_extract(self, message: str) -> Dict[str, Any]:
        """Deterministic regex parsing engine for Roman Urdu and English travel parameters."""
        entities: Dict[str, Any] = {}
        msg = message.lower()

        # Destination
        destinations = [
            "hunza", "skardu", "swat", "kalam", "malam jabba", "naran", "kaghan",
            "chitral", "kumrat", "fairy meadows", "gilgit", "gwadar", "murree",
            "neelum valley", "azad kashmir", "deosai", "ayubia", "shogran"
        ]
        for d in destinations:
            if d in msg:
                entities["destination"] = d.title()
                break

        # Duration
        days_match = re.search(r"\b(\d+)[-\s]*(?:din|days?|day|nights?)\b", msg)
        if days_match:
            entities["duration"] = int(days_match.group(1))
            entities["duration_days"] = int(days_match.group(1))

        # Travelers
        ppl_match = re.search(r"\b(\d+)\s*(?:people|persons?|friends?|travelers?|log|banday|members?)\b", msg)
        if ppl_match:
            entities["travelers"] = int(ppl_match.group(1))
        elif "akela" in msg or "solo" in msg:
            entities["travelers"] = 1

        # Budget Per Person
        # 1. Match "30k" or "40 k" with explicit word boundary to avoid matching "30000 kardo" as 30000k
        k_match = re.search(r"\b(\d{1,3})\s*k\b(?:\s*per\s*person|\s*each|\s*total)?", msg)
        # 2. Match exact numbers like "30000", "40,000", "Rs. 25000"
        pkr_match = re.search(r"(?:rs\.?|pkr|budget|with)?\s*(\d{4,7})\b", msg)
        if k_match:
            amount = float(k_match.group(1)) * 1000
            entities["budget_per_person"] = amount
        elif pkr_match:
            amount = float(pkr_match.group(1).replace(",", ""))
            entities["budget_per_person"] = amount

        # Origin
        if "from islamabad" in msg or "islamabad se" in msg:
            entities["origin"] = "Islamabad"
        elif "from lahore" in msg or "lahore se" in msg:
            entities["origin"] = "Lahore"
        elif "from karachi" in msg or "karachi se" in msg:
            entities["origin"] = "Karachi"
        else:
            entities["origin"] = "Islamabad"

        return entities

    async def parse_user_message(self, message: str) -> Dict[str, Any]:
        """Extract structured intent and requirements using LLMRouter with hybrid regex enhancement."""
        intent = self.detect_intent(message)
        schema = TripRequirements.model_json_schema()
        regex_entities = self._regex_extract(message)

        # Try LLM structured extraction
        try:
            llm_result = await self.router.generate_structured(
                task=TaskType.EXTRACTION,
                prompt=f"Extract travel parameters from this message: '{message}'",
                response_schema=schema,
                system_prompt="You are an expert travel assistant extracting destination, origin, duration_days, travelers, and budget_per_person for Pakistan trips.",
            )
            validated = TripRequirements.model_validate(llm_result)
            entities = validated.model_dump(exclude_none=True)
            if "duration_days" in entities:
                entities["duration"] = entities["duration_days"]

            # Merge and prioritize regex matches for numbers and destination if LLM missed or hallucinated
            for k, v in regex_entities.items():
                if k not in entities or entities[k] is None or k in ("destination", "travelers", "duration", "budget_per_person"):
                    entities[k] = v

            travelers = entities.get("travelers", 1) or 1
            if "budget_per_person" in entities and entities["budget_per_person"]:
                entities["budget_total"] = entities["budget_per_person"] * travelers

            logger.info(f"Extracted trip requirements: {entities}")
            return {
                "intent": intent,
                "entities": entities,
                "raw_message": message,
            }
        except Exception as e:
            logger.info(f"LLM extraction fallback to deterministic parser ({e})")
            return {
                "intent": intent,
                "entities": regex_entities,
                "raw_message": message,
            }
