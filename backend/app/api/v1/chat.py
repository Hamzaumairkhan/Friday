"""Chat & AI Copilot API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.database import get_db
from app.models.conversation import Conversation, Message
from app.models.agent_run import AgentRun
from app.schemas.chat import ChatRequest, ChatResponse, ConversationResponse
from app.services.trip_service import TripService
from app.graph.workflow import execute_friday_workflow
from app.core.security import get_current_user_id
from app.core.logging import get_logger
from app.core.rate_limiter import check_rate_limit
from app.utils.helpers import generate_id
import time

logger = get_logger("api.chat")
router = APIRouter(prefix="/chat", tags=["AI Copilot Chat"])


@router.post("", response_model=ChatResponse)
async def chat_with_friday(
    req: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(check_rate_limit),
):
    start_time = time.time()
    trip_service = TripService(db)

    # 1. Resolve or create Conversation
    conversation_id = req.conversation_id
    conversation = None
    if conversation_id:
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
        )
        conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(
            user_id=user_id,
            trip_id=req.trip_id,
            title=req.message[:40] + ("..." if len(req.message) > 40 else ""),
        )
        db.add(conversation)
        await db.flush()
        conversation_id = conversation.id

    # 2. Record incoming user message
    seq = len(conversation.messages) if conversation.messages else 0
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=req.message,
        sequence=seq + 1,
    )
    db.add(user_msg)
    await db.flush()

    # 3. Fetch existing TripState if trip_id provided
    trip_state_dict = None
    if req.trip_id:
        try:
            trip_obj = await trip_service.get_trip(req.trip_id, user_id)
            trip_state = await trip_service.to_trip_state(trip_obj)
            trip_state_dict = trip_state.model_dump()
        except Exception as e:
            logger.warning(f"Could not load existing trip state for {req.trip_id}: {e}")

    # 4. Execute LangGraph workflow
    final_state = await execute_friday_workflow(
        user_message=req.message,
        user_id=user_id,
        conversation_id=conversation_id,
        trip_id=req.trip_id,
        trip_state=trip_state_dict,
    )

    assistant_reply = final_state.get("agent_response", "Zabardast! Main aapka trip plan kar raha hoon.")
    actions_taken = final_state.get("actions_taken", [])
    output_trip_state = final_state.get("trip_state")

    # 5. Record assistant response message
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_reply,
        sequence=seq + 2,
    )
    db.add(assistant_msg)

    # 6. Log AgentRun observability record
    duration_ms = (time.time() - start_time) * 1000
    agent_run = AgentRun(
        conversation_id=conversation.id,
        trip_id=req.trip_id,
        agent_name="LangGraphOrchestrator",
        status="completed",
        input_data={"message": req.message},
        output_data={"reply": assistant_reply},
        execution_time_ms=round(duration_ms, 2),
        tools_called=actions_taken,
    )
    db.add(agent_run)
    await db.commit()

    return ChatResponse(
        message=assistant_reply,
        conversation_id=conversation.id,
        trip_id=req.trip_id,
        trip_state=output_trip_state,
        actions_taken=actions_taken,
    )


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_schema = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sequence": m.sequence,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in (conv.messages or [])
    ]

    return ConversationResponse(
        id=conv.id,
        trip_id=conv.trip_id,
        title=conv.title,
        messages=messages_schema,
    )
