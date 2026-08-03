# backend/tests/test_dynamic_api_source.py
import sys
import json
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.append(str(Path(__file__).resolve().parent.parent))

from scraper.sources.dynamic_api import DynamicAPISource

class TestDynamicAPISource(unittest.TestCase):
    @patch("scraper.sources.dynamic_api.fetcher")
    def test_fetch_all(self, mock_fetcher):
        mock_fetcher.HIJRI_YEAR = "1447"
        mock_fetcher.fetch_university_courses_data.return_value = "/tmp/fake.json"

        raw_row = {
            "CRN": "12345",
            "Division": "01",
            "Activity": "نظري",
            "Teacher": "أحمد",
            "DEPTCode": "0911",
            "Course": "0911-101",
            "Availability": "متاح",
            "College": "علوم الحاسب",
            "DEPT": "علوم الحاسب",
            "CourseTitle": "مبادئ",
            "Hours": 3,
            "StudentsCode": "11",
            "Days": "ح",
            "Time": "0900-1015",
        }

        with patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps([raw_row]))):
            source = DynamicAPISource()
            sections = source.fetch_all("144810")

        self.assertEqual(len(sections), 1)
        self.assertEqual(sections[0].crn, "12345")
        self.assertEqual(mock_fetcher.HIJRI_YEAR, "1448")

if __name__ == "__main__":
    unittest.main()
