"""Models package — import all models so Base.metadata knows about them."""

from app.models.user import User, UserRole
from app.models.trip import Trip, TripMember, TripStatus, MemberRole
from app.models.itinerary import Itinerary, Day, Activity, ActivityCategory
from app.models.budget import Budget, BudgetCategory
from app.models.organizer import Organizer
from app.models.package import Package
from app.models.booking import Booking, BookingStatus, PaymentStatus
from app.models.review import Review
from app.models.conversation import Conversation, Message
from app.models.agent_run import AgentRun
from app.models.notification import Notification, NotificationType
from app.models.trip_group import TripGroup, TripGroupMember, TripGroupMessage, GroupMemberRole

__all__ = [
    "User", "UserRole",
    "Trip", "TripMember", "TripStatus", "MemberRole",
    "Itinerary", "Day", "Activity", "ActivityCategory",
    "Budget", "BudgetCategory",
    "Organizer",
    "Package",
    "Booking", "BookingStatus", "PaymentStatus",
    "Review",
    "Conversation", "Message",
    "AgentRun",
    "Notification", "NotificationType",
    "TripGroup", "TripGroupMember", "TripGroupMessage", "GroupMemberRole",
]
