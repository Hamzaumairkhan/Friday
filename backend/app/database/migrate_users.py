"""Migration script to ensure users table has nullable legacy fields."""

import sqlite3
from pathlib import Path

def migrate_users_table():
    db_path = Path(__file__).resolve().parent.parent.parent / "data" / "friday.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys=off;")
    
    # Check existing columns
    cols = [col[1] for col in cursor.execute("PRAGMA table_info(users)").fetchall()]
    
    cursor.execute("BEGIN TRANSACTION;")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users_new (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE NOT NULL,
        username VARCHAR,
        name VARCHAR,
        full_name VARCHAR,
        hashed_password VARCHAR,
        profile_picture VARCHAR,
        role VARCHAR(9) NOT NULL DEFAULT 'TRAVELER',
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME,
        updated_at DATETIME
    );
    """)
    
    cursor.execute("""
    INSERT INTO users_new (id, email, username, name, full_name, hashed_password, profile_picture, role, is_active, created_at, updated_at)
    SELECT id, email, COALESCE(email, id), COALESCE(name, email), full_name, hashed_password, profile_picture, role, is_active, created_at, updated_at
    FROM users;
    """)
    
    cursor.execute("DROP TABLE users;")
    cursor.execute("ALTER TABLE users_new RENAME TO users;")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);")
    cursor.execute("COMMIT;")
    cursor.execute("PRAGMA foreign_keys=on;")
    
    print("Migration successful! New table info:", cursor.execute("PRAGMA table_info(users)").fetchall())
    conn.close()

if __name__ == "__main__":
    migrate_users_table()
