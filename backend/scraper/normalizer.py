# backend/scraper/normalizer.py
from typing import Any
from schemas import SectionData


STATUS_MAP = {
    "متاح": "متاحة",
    "متاحه": "متاحة",
    "ممتلئة": "ممتلئة",
    "غير متاح": "غير متاحة",
    "غير متاحه": "غير متاحة",
    "غير متاحة": "غير متاحة",
}


def normalize_status(raw_status: str) -> str:
    return STATUS_MAP.get(raw_status.strip(), raw_status.strip())


def normalize_row(raw: dict[str, Any], source_name: str = "unknown") -> SectionData:
    """
    Convert a raw API-like or HTML-mapped dict into a validated SectionData object.
    Mutates `raw` in place (normalizes Availability/Teacher before validation).
    """
    if "Availability" in raw:
        raw["Availability"] = normalize_status(raw["Availability"])

    if "Teacher" in raw:
        raw["Teacher"] = raw["Teacher"].strip() or "غير محدد"

    return SectionData(**raw)
