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
from utils import send_telegram_alert
from sqlmodel import Session, SQLModel


def main():
    """Execute the scraping pipeline, sync results to database, and log run status."""

    SQLModel.metadata.create_all(engine)

    parser = argparse.ArgumentParser(description="KFU Course Scraper CLI")
    parser.add_argument("--term", default=config.DEFAULT_TERM_CODE, help="Term code, e.g., 144810")
    parser.add_argument("--dry-run", action="store_true", help="Fetch only, do not write to DB")
    parser.add_argument(
        "--force-purge",
        action="store_true",
        default=os.getenv("FORCE_PURGE", "").strip().lower() == "true",
        help="Delete stale rows even if this run is much smaller than the DB (e.g., a smaller new term)",
    )
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

        note = None
        if not args.dry_run:
            sync = sync_sections_to_db(result.sections, result.source_used, force_purge=args.force_purge)
            if not sync.purged:
                note = (
                    f"Purge skipped: run has {sync.new_sections} sections vs {sync.existing_sections} in DB "
                    f"(below {config.PURGE_MIN_RATIO:.0%}). Updates applied, stale rows kept. "
                    f"Re-run with --force-purge if the drop is real."
                )
                print(note, file=sys.stderr)
                send_telegram_alert(f"[{result.source_used}] {note}", level="warning")

        with Session(engine) as session:
            status = session.get(ScrapeStatus, run_id)
            status.status = "completed"
            status.source = result.source_used
            status.last_run_finished = datetime.now(timezone.utc)
            status.total_sections_scraped = result.total_sections
            status.error_message = note
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
