import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from unittest.mock import patch

from scraper.pipeline import Pipeline, PipelineError
from scraper.sources.base import Source
from schemas import SectionData


def make_section(crn: str) -> SectionData:
    return SectionData(**{
        "CRN": crn,
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
    })


class FakeSource(Source):
    def __init__(self, name, sections=None, raise_on_call=False):
        self.name = name
        self._sections = sections or []
        self._raise = raise_on_call

    def fetch_all(self, term_code):
        if self._raise:
            raise RuntimeError("boom")
        return self._sections


class TestPipeline(unittest.TestCase):
    @patch("scraper.pipeline.config.MIN_SECTIONS_THRESHOLD", 1)
    @patch("scraper.pipeline.send_telegram_alert")
    def test_static_success(self, mock_alert):
        static = FakeSource("static_html", [make_section("1")])
        dynamic = FakeSource("dynamic_api", [make_section("2")])
        pipeline = Pipeline("144810", sources=[static, dynamic])
        result = pipeline.run()
        self.assertEqual(result.source_used, "static_html")
        self.assertEqual(len(result.sections), 1)
        mock_alert.assert_not_called()

    @patch("scraper.pipeline.config.MIN_SECTIONS_THRESHOLD", 1)
    @patch("scraper.pipeline.send_telegram_alert")
    def test_fallback_to_dynamic(self, mock_alert):
        static = FakeSource("static_html", raise_on_call=True)
        dynamic = FakeSource("dynamic_api", [make_section("2")])
        pipeline = Pipeline("144810", sources=[static, dynamic])
        result = pipeline.run()
        self.assertEqual(result.source_used, "dynamic_api")
        mock_alert.assert_called_once()

    @patch("scraper.pipeline.config.MIN_SECTIONS_THRESHOLD", 1)
    @patch("scraper.pipeline.send_telegram_alert")
    def test_all_fail_raises(self, mock_alert):
        static = FakeSource("static_html", raise_on_call=True)
        dynamic = FakeSource("dynamic_api", raise_on_call=True)
        pipeline = Pipeline("144810", sources=[static, dynamic])
        with self.assertRaises(PipelineError):
            pipeline.run()

    @patch("scraper.pipeline.config.MIN_SECTIONS_THRESHOLD", 100)
    @patch("scraper.pipeline.send_telegram_alert")
    def test_below_threshold_falls_back(self, mock_alert):
        static = FakeSource("static_html", [make_section("1")])
        dynamic = FakeSource("dynamic_api", [make_section("2")])
        pipeline = Pipeline("144810", sources=[static, dynamic])
        result = pipeline.run()
        self.assertEqual(result.source_used, "dynamic_api")
        mock_alert.assert_called_once()


if __name__ == "__main__":
    unittest.main()
