import os
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlmodel import Session
from database import get_db_session, engine
from models import ScrapeStatus
from routers.scraping_job import run_scraping_job

router = APIRouter(
    prefix="/api/admin/scraping",
    tags=["Scraping Admin"]
)

def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Verifies that the provided API key matches the server config."""
    expected_key = os.getenv("SCRAPER_API_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=500, 
            detail="SCRAPER_API_KEY environment variable is not configured on the server."
        )
    if x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
    return x_api_key

@router.post("/trigger", dependencies=[Depends(verify_api_key)])
def trigger_scraping(background_tasks: BackgroundTasks, db: Session = Depends(get_db_session)):
    """Triggers the scraping process in the background if not already running."""
    status_record = db.get(ScrapeStatus, 1)
    if status_record and status_record.status == "running":
        raise HTTPException(
            status_code=400, 
            detail="A scraping process is already running in the background."
        )
    
    # Enqueue background task
    background_tasks.add_task(run_scraping_job, engine)
    
    return {
        "status": "running", 
        "message": "Scraping task started in the background."
    }

@router.get("/status", response_model=ScrapeStatus, dependencies=[Depends(verify_api_key)])
def get_scraping_status(db: Session = Depends(get_db_session)):
    """Retrieves the current status of the scraping job."""
    status_record = db.get(ScrapeStatus, 1)
    if not status_record:
        return ScrapeStatus(id=1, status="idle")
    return status_record