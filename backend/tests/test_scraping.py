import os
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app
from models import ScrapeStatus
from database import engine
from sqlmodel import Session, SQLModel, select


class TestScrapingStatus(unittest.TestCase):
    def setUp(self):
        os.environ["SCRAPER_API_KEY"] = "test_secret_key_123"
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            for row in session.exec(select(ScrapeStatus)).all():
                session.delete(row)
            session.commit()
        self.client = TestClient(app)

    def test_missing_api_key(self):
        response = self.client.get("/api/admin/scraping/status")
        self.assertEqual(response.status_code, 422)

    def test_invalid_api_key(self):
        headers = {"X-API-Key": "wrong_key"}
        response = self.client.get("/api/admin/scraping/status", headers=headers)
        self.assertEqual(response.status_code, 401)

    def test_status_success(self):
        headers = {"X-API-Key": "test_secret_key_123"}
        response = self.client.get("/api/admin/scraping/status", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "idle")


if __name__ == "__main__":
    unittest.main()
