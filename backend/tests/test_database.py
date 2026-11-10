import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine

from database import init_db, normalize_database_url
import models  # noqa: F401


class TestNormalizeDatabaseUrl(unittest.TestCase):
    def test_pins_psycopg2_for_postgresql_scheme(self):
        self.assertEqual(normalize_database_url("postgresql://u:p@h:6543/db"),
                         "postgresql+psycopg2://u:p@h:6543/db")

    def test_pins_psycopg2_for_legacy_postgres_scheme(self):
        self.assertEqual(normalize_database_url("postgres://u:p@h/db"),
                         "postgresql+psycopg2://u:p@h/db")

    def test_keeps_explicit_driver(self):
        self.assertEqual(normalize_database_url("postgresql+psycopg2://u:p@h/db"),
                         "postgresql+psycopg2://u:p@h/db")

    def test_strips_quotes(self):
        self.assertEqual(normalize_database_url(' "postgresql://u:p@h/db" '),
                         "postgresql+psycopg2://u:p@h/db")

    def test_empty_falls_back_to_sqlite(self):
        self.assertTrue(normalize_database_url("").startswith("sqlite:///"))


def index_names(engine, table):
    return {ix["name"] for ix in inspect(engine).get_indexes(table)}


class TestInitDb(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")

    def test_creates_indexes_on_fresh_db(self):
        init_db(self.engine)

        self.assertIn("idx_section_course", index_names(self.engine, "section"))
        self.assertIn("idx_course_department", index_names(self.engine, "course"))

    def test_adds_missing_indexes_to_existing_tables(self):
        # Simulate a live DB whose tables were created before the indexes existed
        SQLModel.metadata.create_all(self.engine)
        with self.engine.begin() as conn:
            conn.execute(text("DROP INDEX idx_section_course"))
            conn.execute(text("DROP INDEX idx_course_department"))

        init_db(self.engine)

        self.assertIn("idx_section_course", index_names(self.engine, "section"))
        self.assertIn("idx_course_department", index_names(self.engine, "course"))

    def test_is_safe_to_run_twice(self):
        init_db(self.engine)
        init_db(self.engine)


if __name__ == "__main__":
    unittest.main()
