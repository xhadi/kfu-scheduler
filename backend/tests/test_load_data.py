import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, SQLModel, create_engine
from scraper.load_data import sync_sections_to_db
from schemas import SectionData
from models import College, Department, Course, Section


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

    def test_purge_reused_crn_with_different_key(self):
        sync_sections_to_db([make_section("11111", dept_code="0911")], source_used="static_html", db_engine=self.engine)

        # KFU reuses CRNs across terms, so the same CRN can come back under another course
        sync_sections_to_db([make_section("11111", dept_code="0912")], source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            self.assertIsNone(session.get(Section, ("11111", "01", "0911-101")))
            self.assertIsNotNone(session.get(Section, ("11111", "01", "0912-101")))

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

    def test_purge_course_not_offered_in_new_run(self):
        sync_sections_to_db(
            [make_section("11111", dept_code="0911"), make_section("22222", dept_code="0912")],
            source_used="static_html", db_engine=self.engine,
        )

        # 0912-101 is not offered this term, so it must leave the catalog
        sync_sections_to_db([make_section("11111", dept_code="0911")], source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            self.assertIsNotNone(session.get(Course, "0911-101"))
            self.assertIsNone(session.get(Course, "0912-101"))
            self.assertIsNone(session.get(Section, ("22222", "01", "0912-101")))
            self.assertIsNone(session.get(Department, "0912"))
            self.assertIsNotNone(session.get(Department, "0911"))

    def test_purge_college_with_no_courses(self):
        sync_sections_to_db(
            [make_section("11111", dept_code="0911"), make_section("22222", dept_code="0411")],
            source_used="static_html", db_engine=self.engine,
        )

        sync_sections_to_db([make_section("11111", dept_code="0911")], source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            self.assertIsNotNone(session.get(College, "09"))
            self.assertIsNone(session.get(College, "04"))

    def test_updates_changed_course_and_section_fields(self):
        sync_sections_to_db([make_section("11111")], source_used="static_html", db_engine=self.engine)

        changed = make_section("11111")
        changed.course_title = "مبادئ البرمجة"
        changed.teacher = "محمد"
        sync_sections_to_db([changed], source_used="static_html", db_engine=self.engine)

        with Session(self.engine) as session:
            self.assertEqual(session.get(Course, "0911-101").title, "مبادئ البرمجة")
            self.assertEqual(session.get(Section, ("11111", "01", "0911-101")).teacher, "محمد")

    def _seed_four_sections(self):
        sync_sections_to_db(
            [make_section(crn) for crn in ("11111", "22222", "33333", "44444")],
            source_used="static_html", db_engine=self.engine,
        )

    def test_guard_skips_purge_when_run_is_much_smaller(self):
        self._seed_four_sections()

        # A partial scrape (1 of 4) must not wipe the other sections
        changed = make_section("11111")
        changed.teacher = "محمد"
        result = sync_sections_to_db([changed], source_used="dynamic_api", db_engine=self.engine)

        self.assertFalse(result.purged)
        with Session(self.engine) as session:
            self.assertIsNotNone(session.get(Section, ("44444", "01", "0911-101")))
            # Updates from the partial run are still applied
            self.assertEqual(session.get(Section, ("11111", "01", "0911-101")).teacher, "محمد")

    def test_force_purge_overrides_guard(self):
        self._seed_four_sections()

        result = sync_sections_to_db([make_section("11111")], source_used="static_html",
                                     db_engine=self.engine, force_purge=True)

        self.assertTrue(result.purged)
        with Session(self.engine) as session:
            self.assertIsNone(session.get(Section, ("44444", "01", "0911-101")))

    def test_guard_allows_normal_shrink(self):
        self._seed_four_sections()

        result = sync_sections_to_db([make_section(c) for c in ("11111", "22222", "33333")],
                                     source_used="static_html", db_engine=self.engine)

        self.assertTrue(result.purged)
        with Session(self.engine) as session:
            self.assertIsNone(session.get(Section, ("44444", "01", "0911-101")))


if __name__ == "__main__":
    unittest.main()
