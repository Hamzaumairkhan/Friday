"""Agent run tracking model — observability."""

from sqlalchemy import Column, String, Float, Integer, Text, JSON, ForeignKey

from app.database.base import Base, IDMixin, TimestampMixin


class AgentRun(Base, IDMixin, TimestampMixin):
    __tablename__ = "agent_runs"

    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True, index=True)
    trip_id = Column(String, ForeignKey("trips.id"), nullable=True, index=True)
    agent_name = Column(String, nullable=False)
    status = Column(String, default="started")  # started, completed, failed
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    execution_time_ms = Column(Float, nullable=True)
    model_used = Column(String, nullable=True)
    token_usage = Column(JSON, nullable=True)  # {"prompt": x, "completion": y}
    tools_called = Column(JSON, nullable=True)
