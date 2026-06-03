from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

# Import database and models BEFORE the lifespan runs to avoid the import trap
from database import engine
import models 

# Import our newly built routers
from routers import colleges, schedules

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database tables...")
    # This safely builds your tables the moment you start the server
    SQLModel.metadata.create_all(engine)
    yield

app = FastAPI(title="KFU Schedule Maker API", lifespan=lifespan)

# ==========================================
# CORS Security (Cross-Origin Resource Sharing)
# ==========================================
# This tells FastAPI to accept requests from your local React development server.
# Vite runs on port 5173 by default. 
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Router Registration
# ==========================================
# This hooks up all the endpoints we wrote in the routers/ folder
app.include_router(colleges.router)
app.include_router(schedules.router)

# ==========================================
# Root Health Check
# ==========================================
@app.get("/")
def root():
    return {"status": "healthy", "message": "KFU Schedule Maker API is running!"}