# backend/scraper/config.py
import os
from scraper.fetcher import DEPARTMENT_MAP

STATIC_BASE_URL = "https://ssb-ar.kfu.edu.sa/PROD_ar/ws"

# Derive college codes from the existing dynamic API department map.
COLLEGE_CODES = sorted({info["college_id"] for info in DEPARTMENT_MAP.values()})

SEX_CODES = ["11", "12"]

DEFAULT_TERM_CODE = (os.getenv("TERM_CODE") or "144810").strip()


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


MIN_SECTIONS_THRESHOLD = _env_int("MIN_SECTIONS_THRESHOLD", 1000)

REQUEST_DELAY_SECONDS = 1
MAX_RETRIES = 3