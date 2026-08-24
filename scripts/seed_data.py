"""Standalone script to seed the database."""

import asyncio
import os
import sys

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from app.database.database import init_db
from app.database.seed import seed_initial_data_async


async def main():
    print("Initializing database schema...")
    await init_db()
    print("Seeding demo data...")
    await seed_initial_data_async()
    print("Database seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
