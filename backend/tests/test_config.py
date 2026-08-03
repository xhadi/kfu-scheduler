# backend/tests/test_config.py
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parent.parent))

from scraper import config

class TestConfig(unittest.TestCase):
    def test_college_codes_from_department_map(self):
        self.assertTrue(len(config.COLLEGE_CODES) > 0)
        self.assertIn("09", config.COLLEGE_CODES)

    def test_sex_codes(self):
        self.assertEqual(config.SEX_CODES, ["11", "12"])

    def test_env_int_falls_back_on_bad_value(self):
        with patch.dict(os.environ, {"MIN_SECTIONS_THRESHOLD": "bad"}):
            self.assertEqual(config._env_int("MIN_SECTIONS_THRESHOLD", 1000), 1000)

    def test_env_int_reads_valid_value(self):
        with patch.dict(os.environ, {"MIN_SECTIONS_THRESHOLD": "2500"}):
            self.assertEqual(config._env_int("MIN_SECTIONS_THRESHOLD", 1000), 2500)

if __name__ == "__main__":
    unittest.main()
