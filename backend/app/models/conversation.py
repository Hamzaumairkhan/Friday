"""Conversation and Message models."""

from sqlalchemy import Column, String, Text, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship

from app.database.base import Base, IDMixin, TimestampMixin


class Conversation(Base, IDMixin, TimestampMixin):
    __tablename__ = "conversations"

    trip_id = Column(String, ForeignKey("trips.id"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=True)

    trip = relationship("Trip", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.sequence")


class Message(Base, IDMixin, TimestampMixin):
    __tablename__ = "messages"

    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # user | assistant | system | tool
    content = Column(Text, nullable=False)
    sequence = Column(Integer, nullable=False, default=0)
    metadata_ = Column("metadata", JSON, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
