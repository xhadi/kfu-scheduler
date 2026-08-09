"""
Database setup and session lifecycle module.
Initializes the SQLModel engine from DATABASE_URL env var (supporting SQLite and PostgreSQL)
and yields database session dependencies for FastAPI routes.
"""

from collections.abc import Generator
from pathlib import Path
from sqlmodel import Session, create_engine
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).resolve().parent / ".env")


# 1. Define the Database URL
BASE_DIR = Path(__file__).resolve().parent
raw_url = os.getenv("DATABASE_URL", "").strip()

# Remove surrounding quotes if present in env var or GitHub Secret
if (raw_url.startswith('"') and raw_url.endswith('"')) or (raw_url.startswith("'") and raw_url.endswith("'")):
    raw_url = raw_url[1:-1].strip()

# Fallback to local SQLite if DATABASE_URL is not set or empty
if not raw_url:
    DATABASE_URL = f"sqlite:///{BASE_DIR}/courses.db"
else:
    DATABASE_URL = raw_url

# Fix for Render/Supabase legacy postgres:// protocol string
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


# 2. Create the SQLModel Engine
# The engine is the core interface to the database. It manages connections and allows you to execute SQL statements.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # Use NullPool for PostgreSQL / Supabase Transaction Mode pooler (port 6543)
    # to delegate connection pooling to Supabase and avoid local QueuePool timeouts.
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
        echo=False
    )

# 3. Create a Dependency for FastAPI Routes
def get_db_session() -> Generator[Session, None, None]:
    """
    A generator function that yields a database session.
    FastAPI will inject this into your endpoints, automatically closing 
    the connection once the API request finishes.
    """
    with Session(engine) as session:
        yield session