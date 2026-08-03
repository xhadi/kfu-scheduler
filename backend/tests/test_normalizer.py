# backend/tests/test_normalizer.py
import sys
import json
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from scraper.normalizer import normalize_status, normalize_row
from schemas import SectionData
from pydantic import ValidationError

class TestNormalizer(unittest.TestCase):
    def test_normalize_status(self):
        self.assertEqual(normalize_status("متاح"), "متاحة")
        self.assertEqual(normalize_status("متاحه"), "متاحة")
        self.assertEqual(normalize_status("ممتلئة"), "ممتلئة")
        self.assertEqual(normalize_status("غير متاح"), "غير متاحة")
        self.assertEqual(normalize_status("غير متاحه"), "غير متاحة")

    def test_normalize_html_row(self):
        raw = {
            "CRN": "56920",
            "Division": "01",
            "Activity": "نظري",
            "Availability": "متاحه",
            "Teacher": "مروان محمد امين الحاج",
            "Course": "0901-204",
            "CourseTitle": "البرمجة الهندسية",
            "Hours": "3",
            "Days": "ح",
            "Time": "0900 - 1015",
            "StudentsCode": "11",
            "DEPTCode": "0901",
            "College": "علوم الحاسب وتقنية المعلومات",
            "DEPT": "علوم الحاسب",
        }
        section = normalize_row(raw, source_name="static_html")
        self.assertEqual(section.crn, "56920")
        self.assertEqual(section.gender, "male")
        self.assertEqual(section.section_status, "متاحة")
        slots = json.loads(section.time_slots)
        self.assertEqual(len(slots), 1)
        self.assertEqual(slots[0]["day"], "ح")

    def test_normalize_row_edge_cases(self):
        base = {
            "CRN": "99999", "Division": "01", "Activity": "نظري",
            "Course": "0901-204", "CourseTitle": "البرمجة الهندسية",
            "Hours": "3", "Days": "ح", "Time": "0900 - 1015",
            "StudentsCode": "12", "DEPTCode": "0901",
            "College": "علوم الحاسب", "DEPT": "علوم الحاسب",
        }
        # whitespace-only teacher -> default
        row = {**base, "Availability": "متاح", "Teacher": "   "}
        self.assertEqual(normalize_row(row).teacher, "غير محدد")
        # whitespace in status trimmed before mapping
        row = {**base, "Availability": " متاح ", "Teacher": "أحمد"}
        self.assertEqual(normalize_row(row).section_status, "متاحة")
        # unknown variant passes through
        row = {**base, "Availability": "ممتلئ", "Teacher": "أحمد"}
        self.assertEqual(normalize_row(row).section_status, "ممتلئ")
        # missing keys are no-ops at normalize stage, but SectionData requires them
        row = {k: v for k, v in base.items() if k not in ("Availability", "Teacher")}
        with self.assertRaises(ValidationError):
            normalize_row(row)

if __name__ == "__main__":
    unittest.main()
