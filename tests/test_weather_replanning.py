"""Tests for Weather-Aware Replanning."""

from app.agents.replanner_agent import ReplannerAgent


def test_weather_aware_replanning(run_async):
    """Test that bad weather (rain/storm) on a trip day triggers outdoor activity replacement."""
    async def _test():
        agent = ReplannerAgent()

        initial_state = {
            "destination": "Hunza",
            "version": 1,
            "duration": 3,
            "travelers": 2,
            "itinerary": {
                "days": [
                    {
                        "day_number": 1,
                        "activities": [
                            {"title": "Arrival and Hotel Check-in", "category": "TRANSPORT", "notes": "Indoor check-in"}
                        ],
                    },
                    {
                        "day_number": 2,
                        "activities": [
                            {"title": "Attabad Lake Boating & Jet Ski", "category": "ADVENTURE", "notes": "Outdoor lake activities"}
                        ],
                    },
                    {
                        "day_number": 3,
                        "activities": [
                            {"title": "Return Travel", "category": "TRANSPORT", "notes": "Highway transit"}
                        ],
                    },
                ]
            },
        }

        # Simulated forecast with heavy rain on Day 2
        forecast = [
            {"date": "2026-08-20", "condition": "Clear", "pop": 10},
            {"date": "2026-08-21", "condition": "Heavy Rain", "pop": 90, "description": "Thunderstorms & Heavy Rain"},
            {"date": "2026-08-22", "condition": "Clear", "pop": 5},
        ]

        updated_state = await agent.replan_for_weather(
            current_state=initial_state,
            weather_forecast=forecast,
        )

        assert updated_state["version"] == 2
        assert "weather_adjustments" in updated_state
        assert len(updated_state["weather_adjustments"]) == 1

        day2_activities = updated_state["itinerary"]["days"][1]["activities"]
        assert "Indoor Cultural Alternative" in day2_activities[0]["title"]
        assert "Shifted to sheltered indoor tour" in day2_activities[0]["notes"]

    run_async(_test())
