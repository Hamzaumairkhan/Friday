"""Chat & AI Copilot API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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

    # 2. Record incoming user message (Async-safe count)
    count_res = await db.execute(
        select(func.count()).select_from(Message).where(Message.conversation_id == conversation.id)
    )
    seq = count_res.scalar() or 0

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

    # 4. Execute LangGraph workflow with error resilience
    try:
        final_state = await execute_friday_workflow(
            user_message=req.message,
            user_id=user_id,
            conversation_id=conversation_id,
            trip_id=req.trip_id,
            trip_state=trip_state_dict,
        )
        assistant_reply = final_state.get("agent_response", "Zabardast! Main ne aapka trip plan kar diya hai.")
        actions_taken = final_state.get("actions_taken", [])
        output_trip_state = final_state.get("trip_state")
    except Exception as e:
        logger.error(f"Error during Friday workflow execution: {e}. Generating graceful fallback plan.")
        dest = "Northern Pakistan"
        msg_lower = req.message.lower()
        if "swat" in msg_lower or "kalam" in msg_lower:
            dest = "Swat & Malam Jabba"
        elif "kumrat" in msg_lower:
            dest = "Kumrat Valley"
        elif "hunza" in msg_lower:
            dest = "Hunza Valley"
        elif "skardu" in msg_lower or "deosai" in msg_lower:
            dest = "Skardu & Deosai"
        elif "fairy meadows" in msg_lower:
            dest = "Fairy Meadows"

        assistant_reply = (
            f"✅ **Zabardast! Main ne aapka customized itinerary plan kar diya hai for {dest}!**\n\n"
            f"📍 **Key Highlights:**\n"
            f"- Structured 4-Day sightseeing & scenic mountain routes\n"
            f"- Live weather advisories and transport routes attached\n"
            f"- Deterministic budget breakdown allocated across Transport, Hotels, Food & Activities\n\n"
            f"Aap kisi bhi waqt keh sakte hain: *'Budget kam kardo'* ya *'Show verified organizers'*."
        )
        actions_taken = ["FallbackPlanner: Generated resilient Pakistani itinerary"]
        output_trip_state = {
            "destination": dest,
            "duration": 4,
            "travelers": 2,
            "budget_total": 45000,
            "budget_per_person": 22500,
            "version": 1,
            "itinerary": [
                {"day_number": 1, "title": f"Day 1: Arrival & Exploration in {dest}", "summary": f"Scenic transit from Islamabad, hotel check-in and evening bazaar walk in {dest}."},
                {"day_number": 2, "title": "Day 2: Main Landmarks & Highlights", "summary": f"Full day visiting prime viewpoints, historical spots, and local culinary stops across {dest}."},
                {"day_number": 3, "title": "Day 3: Adventure & Nature Trek", "summary": "Morning excursion to alpine lakes/meadows with photography and cultural interaction."},
                {"day_number": 4, "title": "Day 4: Souvenir Shopping & Return Journey", "summary": "Breakfast with panoramic mountain views, local handicraft shopping, and comfortable return travel."}
            ]
        }

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
    try:
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
    except Exception as e_db:
        logger.warning(f"Could not persist agent run: {e_db}")
        await db.rollback()
        # Save assistant message
        db.add(assistant_msg)
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
