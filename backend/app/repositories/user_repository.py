"""User repository — data access layer."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    async def get_or_create_user(
        self,
        user_id: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        profile_picture: Optional[str] = None,
    ) -> User:
        """Find existing user by id or email, or create a default TRAVELER user."""
        user = await self.get_by_id(user_id)
        if user:
            return user

        user_email = email or f"{user_id}@friday.pk"
        user = await self.get_by_email(user_email)
        if user:
            return user

        new_user = User(
            id=user_id,
            email=user_email,
            name=name or f"Traveler {user_id[:6]}",
            profile_picture=profile_picture,
            role=UserRole.TRAVELER,
            is_active=True,
        )
        self.db.add(new_user)
        await self.db.flush()
        return new_user
