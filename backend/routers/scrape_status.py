from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_db_session
from models import ScrapeStatus

router = APIRouter(
    prefix="/api/scraping",
    tags=["Scrape Status"]
)


@router.get("/last-update")
def get_last_scrape_update(db: Session = Depends(get_db_session)):
    status_record = db.exec(
        select(ScrapeStatus).order_by(ScrapeStatus.id.desc())
    ).first()
    if not status_record:
        return {"last_update": None, "status": "idle"}
    return {
        "last_update": status_record.last_run_finished,
        "status": status_record.status
    }
