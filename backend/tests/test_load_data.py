import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, SQLModel, create_engine
from scraper.load_data import sync_sections_to_db
from schemas import SectionData
from models import College, Department, Course, Section, ScrapeStatus


def make_section(crn: str, dept_code: str = "0911", dept_name: str = "علوم الحاسب") -> SectionData:
    return SectionData(**{
        "CRN": crn,
        "Division": "01",
        "Activity": "نظري",
        "Teacher": "أحمد",
        "DEPTCode": dept_code,
        "Course": f"{dept_code}-101",
        "Availability": "متاح",
        "College": "علوم الحاسب",
        "DEPT": dept_name,
        "CourseTitle": "مبادئ",
        "Hours": 3,
        "StudentsCode": "11",
        "Days": "ح",
        "Time": "0900-1015",
    })


class TestLoadData(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(self.engine)

    def test_sync_sections_and_status(self):
        sections = [make_section("11111")]
        sync_sections_to_db(sections, source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            self.assertIsNotNone(session.get(College, "09"))
            self.assertIsNotNone(session.get(Department, "0911"))
            self.assertIsNotNone(session.get(Course, "0911-101"))
            self.assertIsNotNone(session.get(Section, ("11111", "01", "0911-101")))

            status = session.get(ScrapeStatus, 1)
            self.assertIsNotNone(status)
            self.assertEqual(status.status, "completed")
            self.assertEqual(status.source, "static_html")
            self.assertEqual(status.total_sections_scraped, 1)

    def test_purge_old_crns(self):
        sections_v1 = [make_section("11111"), make_section("22222")]
        sync_sections_to_db(sections_v1, source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            self.assertIsNotNone(session.get(Section, ("11111", "01", "0911-101")))
            self.assertIsNotNone(session.get(Section, ("22222", "01", "0911-101")))

        sections_v2 = [make_section("22222"), make_section("33333")]
        sync_sections_to_db(sections_v2, source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            self.assertIsNone(session.get(Section, ("11111", "01", "0911-101")))
            self.assertIsNotNone(session.get(Section, ("22222", "01", "0911-101")))
            self.assertIsNotNone(session.get(Section, ("33333", "01", "0911-101")))

    def test_preserves_existing_dept_name(self):
        sections_v1 = [make_section("11111", dept_code="0911", dept_name="علوم الحاسب")]
        sync_sections_to_db(sections_v1, source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            dept = session.get(Department, "0911")
            self.assertEqual(dept.name, "علوم الحاسب")

        sections_v2 = [make_section("22222", dept_code="0911", dept_name="")]
        sync_sections_to_db(sections_v2, source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            dept = session.get(Department, "0911")
            self.assertEqual(dept.name, "علوم الحاسب")


if __name__ == "__main__":
    unittest.main()
