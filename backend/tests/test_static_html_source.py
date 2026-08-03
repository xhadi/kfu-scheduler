# backend/tests/test_static_html_source.py
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from scraper.sources.static_html import StaticHTMLSource

class TestStaticHTMLSource(unittest.TestCase):
    def test_name(self):
        self.assertEqual(StaticHTMLSource.name, "static_html")

    def test_build_url(self):
        source = StaticHTMLSource()
        url = source._build_url("144810", "09", "11")
        self.assertIn("p_trm_code=144810", url)
        self.assertIn("p_col_code=09", url)
        self.assertIn("p_sex_code=11", url)

    def test_parse_fixture_page(self):
        fixture_path = Path(__file__).resolve().parent / "fixtures" / "sample_static_page.html"
        html = fixture_path.read_text(encoding="utf-8")
        source = StaticHTMLSource()
        sections = source._parse_page(html, "11")
        self.assertEqual(len(sections), 2)

        first = sections[0]
        self.assertEqual(first.crn, "56920")
        self.assertEqual(first.gender, "male")
        self.assertEqual(first.section_status, "متاحة")  # "متاحه" normalized
        self.assertEqual(first.course_id, "0901-204")
        self.assertEqual(first.dept_id, "0901")  # course-prefix derivation
        self.assertEqual(first.dept_name, "علوم الحاسب")
        self.assertEqual(first.college_name, "علوم الحاسب وتقنية المعلومات")

        second = sections[1]
        self.assertEqual(second.course_id, "0912-410")
        self.assertEqual(second.dept_id, "0912")  # per-row course-prefix derivation
        self.assertEqual(second.section_status, "غير متاحة")  # "غير متاحه" normalized
        self.assertEqual(second.dept_name, "نظم المعلومات")  # reverse-map hit for "0912"

    def test_unrecognized_headers_raise(self):
        html = """<html><body>
        <table class="normaltxt"><tr>
          <td>Foo</td><td>Bar</td><td>Baz</td>
        </tr></table>
        </body></html>"""
        source = StaticHTMLSource()
        with self.assertRaises(ValueError) as ctx:
            source._parse_page(html, "11")
        self.assertIn("Unrecognized column headers", str(ctx.exception))

    def test_no_normaltxt_table_raises(self):
        source = StaticHTMLSource()
        with self.assertRaises(ValueError):
            source._parse_page("<html><body>empty</body></html>", "11")

    def test_malformed_row_skipped(self):
        html = """<html><body>
        <table class="normaltxt"><tr>
          <td>رقم المقرر</td><td>CRN</td><td>الشعبة</td><td>حالة الشعبة</td><td>اسم المقرر</td><td>ساعات</td><td>الأيام</td><td>النشاط</td><td>الوقت</td><td>مدرس المادة</td>
        </tr></table>
        <table class="normaltxt"><tr>
          <td>0901-204</td><td>56920</td><td>01</td><td>متاحه</td><td>البرمجة الهندسية</td><td>3</td><td>ح</td><td>نظري</td><td>0900 - 1015</td><td>مروان محمد امين الحاج</td>
        </tr></table>
        <table class="normaltxt"><tr>
          <td>0901-205</td><td>56921</td><td>02</td><td>متاحه</td><td>مقرر سيء</td><td>ساعات</td><td>ح</td><td>نظري</td><td>0900 - 1015</td><td>مدرس</td>
        </tr></table>
        </body></html>"""
        source = StaticHTMLSource()
        sections = source._parse_page(html, "11")
        self.assertEqual(len(sections), 1)
        self.assertEqual(sections[0].crn, "56920")

if __name__ == "__main__":
    unittest.main()
