from collections.abc import Generator
from pathlib import Path
from sqlmodel import Session, create_engine
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).resolve().parent / ".env")

# 1. Define the Database URL
BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/courses.db")

# Fix for Render's legacy postgres:// protocol string
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# 2. Create the SQLModel Engine
# The engine is the core interface to the database. It manages connections and allows you to execute SQL statements.
# It allows FastAPI to perform concurrent database operations across multiple threads safely.
engine = create_engine(
    DATABASE_URL, 
    connect_args=connect_args,
    echo=False  # Set to True if you want to see raw SQL statements printed in your terminal
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