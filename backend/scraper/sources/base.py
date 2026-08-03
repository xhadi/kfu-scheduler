# backend/scraper/sources/base.py
from abc import ABC, abstractmethod
from typing import List, Optional
from schemas import SectionData


class Source(ABC):
    """Abstract interface for a course catalog source."""

    name: str

    @abstractmethod
    def fetch_all(self, term_code: str) -> List[SectionData]:
        """
        Fetch every section for the given term across all colleges/genders.
        Raises an exception on failure.
        """
        ...