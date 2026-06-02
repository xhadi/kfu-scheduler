from collections.abc import Generator
from sqlmodel import Session, create_engine

# 1. Define the Database URL
# For local development, we use SQLite. 
# Changing this to PostgreSQL or MySQL later requires changing only this single string.
DATABASE_URL = "sqlite:///./courses.db"

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