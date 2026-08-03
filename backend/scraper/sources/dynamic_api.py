# backend/scraper/sources/dynamic_api.py
import json
from typing import List

from scraper import fetcher
from scraper.sources.base import Source
from schemas import SectionData


class DynamicAPISource(Source):
    name = "dynamic_api"

    def fetch_all(self, term_code: str) -> List[SectionData]:
        fetcher.HIJRI_YEAR = term_code[:4]
        json_path = fetcher.fetch_university_courses_data()

        with open(json_path, "r", encoding="utf-8") as f:
            raw_rows = json.load(f)

        return [SectionData(**row) for row in raw_rows]
