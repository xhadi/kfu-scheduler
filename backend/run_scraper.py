"""
CLI entry point for running the KFU course scraper pipeline.
Supports --term and --dry-run CLI flags, records execution state to ScrapeStatus table.
"""

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
    """Execute the scraping pipeline, sync results to database, and log run status."""

    SQLModel.metadata.create_all(engine)

    parser = argparse.ArgumentParser(description="KFU Course Scraper CLI")
    parser.add_argument("--term", default=config.DEFAULT_TERM_CODE, help="Term code, e.g., 144810")
    parser.add_argument("--dry-run", action="store_true", help="Fetch only, do not write to DB")
    args = parser.parse_args()

    with Session(engine) as session:
        status = ScrapeStatus(
            status="running",
            last_run_started=datetime.now(timezone.utc),
        )
        session.add(status)
        session.commit()
        session.refresh(status)
        run_id = status.id

    try:
        pipeline = Pipeline(args.term)
        result = pipeline.run()

        if not args.dry_run:
            sync_sections_to_db(result.sections, result.source_used)

        with Session(engine) as session:
            status = session.get(ScrapeStatus, run_id)
            status.status = "completed"
            status.source = result.source_used
            status.last_run_finished = datetime.now(timezone.utc)
            status.total_sections_scraped = result.total_sections
            status.error_message = None
            session.commit()

        print(f"Scraper completed: {result.total_sections} sections from {result.source_used}")
    except (PipelineError, Exception) as exc:
        with Session(engine) as session:
            status = session.get(ScrapeStatus, run_id)
            status.status = "failed"
            status.last_run_finished = datetime.now(timezone.utc)
            status.error_message = str(exc)
            session.commit()
        print(f"Scraper failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
