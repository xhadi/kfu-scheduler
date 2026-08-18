from datetime import timezone
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
    """Returns timestamp of the last finished scrape job and its status."""

    status_record = db.exec(
        select(ScrapeStatus).order_by(ScrapeStatus.id.desc())
    ).first()
    if not status_record or not status_record.last_run_finished:
        return {"last_update": None, "status": "idle" if not status_record else status_record.status}

    last_update = status_record.last_run_finished
    if last_update.tzinfo is None:
        last_update = last_update.replace(tzinfo=timezone.utc)

    return {
        "last_update": last_update.isoformat(),
        "status": status_record.status
    }
