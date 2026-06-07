import os
import sys
from pathlib import Path
import unittest
from unittest.mock import patch

# Ensure python can find backend modules
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app
from models import ScrapeStatus
from database import engine
from sqlmodel import Session, SQLModel

class TestScrapingRouter(unittest.TestCase):
    def setUp(self):
        # Override environment key for predictable test run
        os.environ["SCRAPER_API_KEY"] = "test_secret_key_123"
        
        # Initialize clean tables
        SQLModel.metadata.create_all(engine)
        
        # Ensure ScrapeStatus is reset
        with Session(engine) as session:
            existing = session.get(ScrapeStatus, 1)
            if existing:
                session.delete(existing)
                session.commit()
        
        self.client = TestClient(app)

    def test_missing_api_key_header(self):
        # Trigger trigger endpoint without header
        response = self.client.post("/api/admin/scraping/trigger")
        self.assertEqual(response.status_code, 422) # Unprocessable Entity (missing header)
        
        # Trigger status endpoint without header
        response = self.client.get("/api/admin/scraping/status")
        self.assertEqual(response.status_code, 422)

    def test_invalid_api_key(self):
        headers = {"X-API-Key": "wrong_key"}
        
        response = self.client.post("/api/admin/scraping/trigger", headers=headers)
        self.assertEqual(response.status_code, 401)
        
        response = self.client.get("/api/admin/scraping/status", headers=headers)
        self.assertEqual(response.status_code, 401)

    @patch("routers.scraping.run_scraping_job")
    def test_trigger_and_status_success(self, mock_job):
        headers = {"X-API-Key": "test_secret_key_123"}
        
        # 1. Fetch initial status (should default to idle)
        response = self.client.get("/api/admin/scraping/status", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "idle")
        
        # 2. Trigger scraping
        response = self.client.post("/api/admin/scraping/trigger", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "running")
        
        # Verify the background worker mock was called
        mock_job.assert_called_once()
        
        # 3. Simulate job setting database status to running
        with Session(engine) as session:
            status = ScrapeStatus(id=1, status="running")
            session.merge(status)
            session.commit()
            
        # Triggering again when running should fail
        response = self.client.post("/api/admin/scraping/trigger", headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "A scraping process is already running in the background.")

if __name__ == "__main__":
    unittest.main()
