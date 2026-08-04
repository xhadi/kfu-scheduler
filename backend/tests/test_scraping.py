import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app
from models import ScrapeStatus
from database import engine
from sqlmodel import Session, SQLModel, select


class TestScrapingStatus(unittest.TestCase):
    def setUp(self):
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            for row in session.exec(select(ScrapeStatus)).all():
                session.delete(row)
            session.commit()
        self.client = TestClient(app)

    def test_last_update_no_records(self):
        response = self.client.get("/api/scraping/last-update")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsNone(data["last_update"])
        self.assertEqual(data["status"], "idle")

    def test_last_update_with_record(self):
        with Session(engine) as session:
            now = datetime.now(timezone.utc)
            record = ScrapeStatus(
                status="completed",
                source="static_html",
                last_run_started=now,
                last_run_finished=now,
                total_sections_scraped=150,
            )
            session.add(record)
            session.commit()

        response = self.client.get("/api/scraping/last-update")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsNotNone(data["last_update"])
        self.assertEqual(data["status"], "completed")


if __name__ == "__main__":
    unittest.main()
