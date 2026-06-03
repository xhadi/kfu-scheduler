from collections.abc import Generator
from pathlib import Path
from sqlmodel import Session, create_engine

# 1. Define the Database URL
# We use a path relative to this file to ensure it works regardless of where the app is started.
BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR}/courses.db"

# 2. Create the SQLModel Engine
# 'connect_args={"check_same_thread": False}' is uniquely required for SQLite.
# It allows FastAPI to perform concurrent database operations across multiple threads safely.
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
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