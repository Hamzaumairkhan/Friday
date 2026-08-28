"""Script to completely wipe and delete all data and all users from Friday database."""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text, inspect
from app.database.database import sync_engine

def clear_all_data():
    print("[*] Inspecting and wiping all tables from Friday database...")
    insp = inspect(sync_engine)
    tables = insp.get_table_names()
    
    with sync_engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys = OFF;"))
        for table in tables:
            print(f"  - Deleting all rows from table: {table}")
            conn.execute(text(f"DELETE FROM {table};"))
        conn.execute(text("PRAGMA foreign_keys = ON;"))

    # Verify counts
    with sync_engine.connect() as conn:
        counts = {t: conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() for t in tables}
        print("\n[*] Verification Table Row Counts:")
        for t, count in counts.items():
            print(f"    - {t}: {count}")

    print("\n[+] All users, packages, bookings, organizers, and trips deleted completely!")
    print("[+] Database is now 100% FRESH and EMPTY.")

if __name__ == "__main__":
    clear_all_data()
