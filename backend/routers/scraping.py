import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session
from database import get_db_session
from models import ScrapeStatus

router = APIRouter(
    prefix="/api/admin/scraping",
    tags=["Scraping Admin"]
)


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    expected_key = os.getenv("SCRAPER_API_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=500,
            detail="SCRAPER_API_KEY environment variable is not configured on the server."
        )
    if x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
    return x_api_key


@router.get("/status", response_model=ScrapeStatus, dependencies=[Depends(verify_api_key)])
def get_scraping_status(db: Session = Depends(get_db_session)):
    status_record = db.get(ScrapeStatus, 1)
    if not status_record:
        return ScrapeStatus(id=1, status="idle")
    return status_record