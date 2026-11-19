import sqlite3
from pathlib import Path

# Put the database file next to this script, inside the backend folder
DB_PATH = Path(__file__).parent / "financeflow.db"


def get_connection():
    """Open a connection to the database."""
    conn = sqlite3.connect(DB_PATH)
    # This lets us read rows like dictionaries: row["title"]
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the tables if they don't exist yet."""
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            type       TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            title      TEXT NOT NULL,
            amount     REAL NOT NULL CHECK (amount > 0),
            category   TEXT NOT NULL,
            date       TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    # Default currency. "OR IGNORE" means: skip this if it's already there
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'NPR')"
    )

    conn.commit()
    conn.close()