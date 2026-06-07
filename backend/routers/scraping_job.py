import logging
import json
import threading
from datetime import datetime, timezone
from sqlmodel import Session
from models import ScrapeStatus
from scraper.fetcher import fetch_university_courses_data
from scraper.load_data import load_data_to_db

logger = logging.getLogger("uvicorn.error")
_scrape_lock = threading.Lock()

def run_scraping_job(engine):
    """
    Background worker that runs the fetcher and loader,
    updating the ScrapeStatus table in the database.
    """
    if not _scrape_lock.acquire(blocking=False):
        logger.warning("Scraping job is already running.")
        return

    try:
        with Session(engine) as session:
            status_record = session.get(ScrapeStatus, 1)
            if not status_record:
                status_record = ScrapeStatus(id=1)
                session.add(status_record)
            
            status_record.status = "running"
            status_record.last_run_started = datetime.now(timezone.utc)
            status_record.error_message = None
            session.commit()
            session.refresh(status_record)

        try:
            logger.info("Background scraping: Fetching course data from KFU...")
            raw_json_path = fetch_university_courses_data()
            
            with open(raw_json_path, "r", encoding="utf-8") as f:
                sections_data = json.load(f)
                total_sections = len(sections_data)
            
            if total_sections == 0:
                raise ValueError("No course sections fetched from KFU (possible rate-limiting or network error).")
            
            logger.info("Background scraping: Loading fetched data into the database...")
            load_data_to_db(raw_json_path)
            
            with Session(engine) as session:
                status_record = session.get(ScrapeStatus, 1)
                if status_record:
                    status_record.status = "completed"
                    status_record.last_run_finished = datetime.now(timezone.utc)
                    status_record.total_sections_scraped = total_sections
                    session.commit()
            logger.info("Background scraping: Successfully completed.")
            
        except Exception as e:
            logger.error(f"Background scraping failed: {str(e)}")
            with Session(engine) as session:
                status_record = session.get(ScrapeStatus, 1)
                if status_record:
                    status_record.status = "failed"
                    status_record.last_run_finished = datetime.now(timezone.utc)
                    status_record.error_message = str(e)
                    session.commit()
    finally:
        _scrape_lock.release()
