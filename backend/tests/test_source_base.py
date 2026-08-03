# backend/tests/test_source_base.py
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from scraper.sources.base import Source

class TestSourceBase(unittest.TestCase):
    def test_source_is_abstract(self):
        with self.assertRaises(TypeError):
            Source()

if __name__ == "__main__":
    unittest.main()
