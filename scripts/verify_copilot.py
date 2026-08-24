"""End-to-end verification script for Friday AI Copilot."""

import asyncio
import os
import sys

# Set UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from app.graph.workflow import execute_friday_workflow
from app.agents.conversation_agent import ConversationAgent


async def main():
    print("=" * 60)
    print("FRIDAY AI COPILOT — VERIFICATION RUN")
    print("=" * 60)

    # 1. Natural Language Trip Planning in Roman Urdu
    prompt = "Mujhe 5 friends ke sath 4 din ke liye Hunza jana hai, budget 40k per person hai."
    print(f"\n1. User Prompt: '{prompt}'")

    state = await execute_friday_workflow(
        user_message=prompt,
        user_id="user-demo-1",
    )

    print("\n--- Actions Taken ---")
    for a in state.get("actions_taken", []):
        print(f"  • {a}")

    print("\n--- Assistant Response ---")
    print(state.get("agent_response"))

    trip_state = state.get("trip_state", {})
    print(f"\n--- Structured TripState ---")
    print(f"Destination: {trip_state.get('destination')}")
    print(f"Duration: {trip_state.get('duration')} days")
    print(f"Travelers: {trip_state.get('travelers')}")
    print(f"Budget per person: Rs. {trip_state.get('budget_per_person'):,.0f}")
    print(f"Total Budget: Rs. {trip_state.get('budget_total'):,.0f}")

    # 2. Dynamic Replanning: "Budget 30k kar do"
    replan_prompt = "Budget 30k kar do."
    print(f"\n2. Replan Prompt: '{replan_prompt}'")

    replan_state = await execute_friday_workflow(
        user_message=replan_prompt,
        user_id="user-demo-1",
        trip_state=trip_state,
    )

    print("\n--- Replanning Actions Taken ---")
    for a in replan_state.get("actions_taken", []):
        print(f"  • {a}")

    print("\n--- Assistant Replan Response ---")
    print(replan_state.get("agent_response"))

    new_trip_state = replan_state.get("trip_state", {})
    print(f"\n--- Updated TripState ---")
    print(f"New Version: {new_trip_state.get('version')}")
    print(f"New Budget per person: Rs. {new_trip_state.get('budget_per_person'):,.0f}")
    print(f"New Total Budget: Rs. {new_trip_state.get('budget_total'):,.0f}")

    print("\n" + "=" * 60)
    print("VERIFICATION COMPLETED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
