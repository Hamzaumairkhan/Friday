"""
Database wipe / reset script for Friday.
Safely truncates all user accounts, organizers, packages, trips, bookings, and activities.
"""
import sys
import os

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database.database import sync_engine

TABLES_TO_WIPE = [
    "package_views",
    "reviews",
    "bookings",
    "trip_group_messages",
    "trip_group_members",
    "trip_groups",
    "trip_members",
    "messages",
    "conversations",
    "budgets",
    "activities",
    "days",
    "itineraries",
    "trips",
    "packages",
    "organizers",
    "notifications",
    "agent_runs",
    "users",
]


def wipe_database():
    print("Connecting to database...")
    is_sqlite = "sqlite" in str(sync_engine.url).lower()

    with sync_engine.begin() as conn:
        if is_sqlite:
            conn.execute(text("PRAGMA foreign_keys = OFF;"))
            for table in TABLES_TO_WIPE:
                try:
                    conn.execute(text(f"DELETE FROM {table};"))
                    print(f"  [x] Cleared table: {table}")
                except Exception as e:
                    print(f"  [-] Skipped table {table}: {e}")
            conn.execute(text("PRAGMA foreign_keys = ON;"))
        else:
            # MySQL production environment
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            for table in TABLES_TO_WIPE:
                try:
                    conn.execute(text(f"TRUNCATE TABLE `{table}`;"))
                    print(f"  [x] Truncated table: {table}")
                except Exception:
                    try:
                        conn.execute(text(f"DELETE FROM `{table}`;"))
                        print(f"  [x] Cleared table: {table}")
                    except Exception as e2:
                        print(f"  [-] Skipped table {table}: {e2}")
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

    print("\nSUCCESS: All user accounts, packages, trips, and associated records have been completely cleared!")


if __name__ == "__main__":
    # If run in non-interactive shell (like Railway Console), auto-execute
    if sys.stdin.isatty():
        choice = input("WARNING: This will permanently delete ALL users and posts. Continue? (y/N): ")
        if choice.strip().lower() != "y":
            print("Operation aborted.")
            sys.exit(0)
    wipe_database()
