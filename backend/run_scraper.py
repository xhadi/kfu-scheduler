import argparse
import os
import sys
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from models import ScrapeStatus
from scraper import config
from scraper.pipeline import Pipeline, PipelineError
from scraper.load_data import sync_sections_to_db
from sqlmodel import Session, SQLModel


def main():
    SQLModel.metadata.create_all(engine)

    parser = argparse.ArgumentParser(description="KFU Course Scraper CLI")
    parser.add_argument("--term", default=config.DEFAULT_TERM_CODE, help="Term code, e.g., 144810")
    parser.add_argument("--dry-run", action="store_true", help="Fetch only, do not write to DB")
    args = parser.parse_args()

    with Session(engine) as session:
        status = session.get(ScrapeStatus, 1)
        if not status:
            status = ScrapeStatus(id=1)
            session.add(status)
        status.status = "running"
        status.last_run_started = datetime.now(timezone.utc)
        session.commit()

    try:
        pipeline = Pipeline(args.term)
        result = pipeline.run()

        if not args.dry_run:
            sync_sections_to_db(result.sections, result.source_used)

        with Session(engine) as session:
            status = session.get(ScrapeStatus, 1)
            status.status = "completed"
            status.source = result.source_used
            status.last_run_finished = datetime.now(timezone.utc)
            status.total_sections_scraped = result.total_sections
            status.error_message = None
            session.commit()

        print(f"Scraper completed: {result.total_sections} sections from {result.source_used}")
    except (PipelineError, Exception) as exc:
        with Session(engine) as session:
            status = session.get(ScrapeStatus, 1)
            status.status = "failed"
            status.last_run_finished = datetime.now(timezone.utc)
            status.error_message = str(exc)
            session.commit()
        print(f"Scraper failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
