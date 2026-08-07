# backend/scraper/sources/static_html.py
import re
import time
from typing import List
import requests
from bs4 import BeautifulSoup

from scraper import config
from scraper.normalizer import normalize_row
from scraper.sources.base import Source
from schemas import SectionData


class StaticHTMLSource(Source):
    """
    Primary catalog source that parses KFU's public static HTML schedule pages.
    Extracts section availability, course info, and time slots directly from HTML tables.
    """
    name = "static_html"

    def _build_url(self, term_code: str, college_code: str, sex_code: str) -> str:
        """Construct the target URL for a given term, college, and gender combination."""
        return (
            f"{config.STATIC_BASE_URL}?"
            f"p_trm_code={term_code}&"
            f"p_col_code={college_code}&"
            f"p_sex_code={sex_code}"
        )

    def _fetch_page(self, term_code: str, college_code: str, sex_code: str) -> List[SectionData]:
        """Fetch and decode the HTML page for a specific college and gender."""
        url = self._build_url(term_code, college_code, sex_code)
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
        response.raise_for_status()
        content = response.content
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("windows-1256", errors="replace")
        return self._parse_page(text, sex_code, college_code)

    def _parse_page(self, html: str, sex_code: str, college_code: str = "") -> List[SectionData]:
        """
        Parse raw HTML using BeautifulSoup and regex byte-offset matching for departments.
        Matches department headers to their corresponding section tables in order.
        """
        soup = BeautifulSoup(html, "html.parser")


        # Extract college name from the first الكلية occurrence.
        college_name = ""
        for td in soup.find_all("td"):
            text = td.get_text(strip=True)
            if re.match(r"الكلية\s*:", text):
                college_name = re.sub(r"^الكلية\s*:\s*", "", text)
                break

        # Find all القسم : blocks with byte positions for per-row dept matching.
        dept_pattern = r"القسم\s*:\s*([^\n<]+)"
        dept_blocks = []  # (byte_pos, dept_name)
        for m in re.finditer(dept_pattern, html):
            dept_blocks.append((m.start(), m.group(1).strip()))

        # Find all data tables with byte positions using regex.
        table_pattern = r'<table class="normaltxt"[^>]*>'
        table_positions = [m.start() for m in re.finditer(table_pattern, html)]

        if len(table_positions) < 1:
            raise ValueError("No table with class 'normaltxt' found")

        # Map headers from the first table.
        tables = soup.find_all("table", class_="normaltxt")
        header_table = tables[0]
        headers = [th.get_text(strip=True) for th in header_table.find_all("td")]
        header_map = self._map_headers(headers)
        if not header_map:
            raise ValueError(f"Unrecognized column headers: {headers}")

        # Build a dept_name lookup: byte_pos of each data table -> dept_name.
        # Skip table_positions[0] (the header table).
        table_dept_map = {}  # table_byte_pos -> dept_name
        for tpos in table_positions[1:]:
            nearest_name = ""
            for bpos, bname in dept_blocks:
                if bpos < tpos:
                    nearest_name = bname
                else:
                    break
            table_dept_map[tpos] = nearest_name

        sections: List[SectionData] = []
        skipped_rows = 0
        # Iterate data tables (skip index 0 = header).
        for table_idx, table in enumerate(tables[1:], start=1):
            # Find the byte position of this table in the raw HTML.
            table_byte_pos = table_positions[table_idx] if table_idx < len(table_positions) else -1
            block_dept_name = table_dept_map.get(table_byte_pos, "")

            for row in table.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) <= max(header_map):
                    continue

                raw = {}
                for idx, key in header_map.items():
                    raw[key] = cells[idx].get_text(strip=True)

                # Derive DEPTCode per row: course prefix first, name map as fallback.
                course_id = raw.get("Course", "")
                dept_code = course_id.split("-")[0] if course_id else ""

                # Add derived / static fields.
                raw["StudentsCode"] = sex_code
                raw["College"] = college_name
                raw["college_id"] = college_code
                raw["DEPT"] = block_dept_name
                raw["DEPTCode"] = dept_code

                try:
                    sections.append(normalize_row(raw, source_name=self.name))
                except Exception:
                    skipped_rows += 1
                    continue

        if skipped_rows:
            print(f"StaticHTMLSource._parse_page skipped {skipped_rows} malformed rows")
        return sections

    def _map_headers(self, headers: List[str]) -> dict[int, str]:
        """Map raw Arabic table header labels to canonical internal field names."""
        mapping = {
            "رقم المقرر": "Course",
            "CRN": "CRN",
            "الشعبة": "Division",
            "حالة الشعبة": "Availability",
            "اسم المقرر": "CourseTitle",
            "ساعات": "Hours",
            "الأيام": "Days",
            "النشاط": "Activity",
            "الوقت": "Time",
            "مدرس المادة": "Teacher",
        }
        result = {}
        for idx, header in enumerate(headers):
            canonical = mapping.get(header)
            if canonical:
                result[idx] = canonical
        return result

    def fetch_all(self, term_code: str) -> List[SectionData]:
        """Iterate all configured college and gender codes to fetch and parse every section."""
        sections: List[SectionData] = []

        for college_code in config.COLLEGE_CODES:
            for sex_code in config.SEX_CODES:
                page_sections = self._fetch_page(term_code, college_code, sex_code)
                sections.extend(page_sections)
                time.sleep(config.REQUEST_DELAY_SECONDS)
        return sections
