"""Chat schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    trip_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    trip_id: Optional[str] = None
    trip_state: Optional[dict] = None
    actions_taken: list[str] = Field(default_factory=list)


class MessageSchema(BaseModel):
    id: str
    role: str
    content: str
    sequence: int
    created_at: str

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    trip_id: Optional[str] = None
    title: Optional[str] = None
    messages: list[MessageSchema] = Field(default_factory=list)

    model_config = {"from_attributes": True}
