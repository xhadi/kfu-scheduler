from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import database and models BEFORE the lifespan runs to avoid the import trap
from database import init_db
import models  # noqa: F401

# Import our newly built routers
from routers import colleges, schedules, scrape_status

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database tables...")
    # Builds missing tables and indexes the moment you start the server
    init_db()
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
    
    # Firebase Hosting URL
    "https://kfu-scheduler.web.app",
    "https://kfu-scheduler.firebaseapp.com"
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
app.include_router(scrape_status.router)

# ==========================================
# Root Health Check
# ==========================================
@app.get("/")
def root():
    return {"status": "healthy", "message": "KFU Schedule Maker API is running!"}