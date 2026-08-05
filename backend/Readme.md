# KFU Scheduler Backend

FastAPI + SQLModel backend for the KFU Schedule Maker. Provides a REST API for browsing university structure (colleges, departments, courses), generating conflict-free schedule combinations, and tracking scrape status. Includes a scraper pipeline that fetches course data from KFU's systems.

## Quick Start

**Prerequisites:** Python 3.12+, pip

```bash
# Create virtual environment
python -m venv .venv

# Activate it
# Windows (CMD/PowerShell):
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy example env file and configure
cp .env.example .env

# Start the API server (auto-creates SQLite database on startup)
uvicorn main:app --reload

# Run the scraper (optional)
python run_scraper.py --term 144810
python run_scraper.py --term 144810 --dry-run  # fetch only, skip DB write
```

The API server runs on `http://localhost:8000`. The Vite frontend dev server (port 5173) proxies /api to this address — see frontend/README.md

## API Endpoints

### University Structure

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/colleges` | List all colleges |
| GET | `/api/colleges/{college_id}/departments` | Departments for a college |
| GET | `/api/departments/{dept_id}/courses` | Courses for a department |

**GET `/api/colleges`**

Response:
```json
[
  {"id": "07", "name": "كلية الزراعة وعلوم الأغذية"},
  {"id": "09", "name": "كلية علوم الحاسب وتقنية المعلومات"}
]
```

**GET `/api/colleges/09/departments`**

Response:
```json
[
  {"id": "0911", "name": "علوم الحاسب", "college_id": "09"},
  {"id": "0921", "name": "هندسة الحاسب", "college_id": "09"}
]
```

**GET `/api/departments/0921/courses`**

Response:
```json
[
  {"id": "0921-101", "title": "مقدمة في البرمجة", "hours": 3, "department_id": "0921"},
  {"id": "0921-120", "title": "برمجة 1", "hours": 4, "department_id": "0921"}
]
```

### Schedule Generator

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/schedules/generate` | Generate conflict-free schedule combinations |

Request:
```json
{"course_ids": ["0921-101", "0921-120"], "gender": "male"}
```

Response:
```json
[
  [
    {
      "crn": "12345",
      "section_number": "01",
      "course_id": "0921-101",
      "section_type": "نظري",
      "teacher": "د. أحمد",
      "time_slots": [{"day": "ح", "start": "08:00", "end": "09:15"}]
    }
  ]
]
```

**Error responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 422 | Invalid request body | `{"detail": [{"type": "missing", "loc": ["body", "course_ids"], ...}]}` |
| 404 | No sections found for course | `{"detail": "No sections found for course 0921-999"}` |
| 500 | Internal server error | `{"detail": "Internal server error"}` |

The generator uses recursive backtracking with an MRV (Minimum Remaining Values) heuristic. It pre-computes a conflict matrix for bundle pairs, then generates all valid non-conflicting combinations. Theory sections are linked to practical sections via LINKING_RULES offsets, defined per college for colleges that require theory/practical linking (currently CCSIT "09" and Agricultural "01").

### Scrape Status

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/scraping/last-update` | Latest scrape run status |

Response:
```json
{
  "last_update": "2026-08-04T10:05:30",
  "status": "completed"
}
```

If no scrape records exist:
```json
{
  "last_update": null,
  "status": "idle"
}
```

### Health Check

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Server health status |

Response:
```json
{"status": "healthy", "message": "KFU Schedule Maker API is running!"}
```

## Scraper Architecture

### Source-Adapter Pattern

The scraper uses a source-adapter pattern with two implementations:

- **StaticHTMLSource** (primary): Parses KFU's Arabic HTML schedule pages. Builds URLs with term/college/sex parameters, uses BeautifulSoup to parse tables, maps Arabic headers to canonical field names, and derives department codes from course ID prefixes.

- **DynamicAPISource** (fallback): Wraps `fetcher.py`, which calls KFU's JSON API endpoint (`GetCoursesByDept`) for each department/gender combination. Saves raw JSON to `scraper/data/`.

Both sources implement the `Source` abstract base class with a `fetch_all(term_code)` method.

### Pipeline

The `Pipeline` class orchestrates the scraping process:

1. Try StaticHTMLSource
   - If sections >= `MIN_SECTIONS_THRESHOLD` → return success
   - Else → send Telegram warning, try next source
2. Try DynamicAPISource
   - If non-empty → return success (with fallback reason)
3. All failed → send critical Telegram alert → raise `PipelineError`

Telegram warnings are rate-limited to once per 6 hours. The pipeline returns a `PipelineResult` with `sections`, `source_used`, `fallback_reason`, and `total_sections`.

### Normalizer

The normalizer processes raw data before validation:

- `normalize_status(raw)`: Maps Arabic status variants (e.g., `"متاح"` → `"متاحة"`, `"غير متاحه"` → `"غير متاحة"`)
- `normalize_row(raw, source_name)`: Normalizes `Availability` and `Teacher` fields, then validates into a `SectionData` object

### Configuration

The `scraper/config.py` module provides:

- `COLLEGE_CODES`: Derived from `DEPARTMENT_MAP` in `fetcher.py`
- `SEX_CODES`: `["11", "12"]` (11=male, 12=female)
- `DEFAULT_TERM_CODE`: From `TERM_CODE` env var, defaults to `"144810"`
- `MIN_SECTIONS_THRESHOLD`: From env var, defaults to `1000`
- `REQUEST_DELAY_SECONDS`: 1 second between requests
- `DEPARTMENT_NAME_TO_CODE`: Static mapping for CCSIT departments (fallback)

## Database

### Models

The database uses SQLModel (SQLAlchemy + Pydantic) with the following models:

- **College**: `id` (PK, e.g., `"09"`), `name`
- **Department**: `id` (PK, e.g., `"0921"`), `name`, `college_id` (FK)
- **Course**: `id` (PK, e.g., `"0921-120"`), `title`, `hours`, `department_id` (FK)
- **Section**: Composite PK `(crn, section_number, course_id)` — all strings. Fields: `section_type`, `section_status`, `teacher`, `gender` (`"male"`/`"female"`), `time_slots` (JSON string: `[{"day":"ح","start":"09:00","end":"10:15"}]`)
- **ScrapeStatus**: Auto-increment `id`, `status` (`"idle"`/`"running"`/`"completed"`/`"failed"`), `source`, `last_run_started`, `last_run_finished`, `total_sections_scraped`, `error_message`

### Database Engines

- **Development**: SQLite (`courses.db` in the backend directory, auto-created on startup)
- **Production**: PostgreSQL via Supabase. The `sync_sections_to_db` function detects PostgreSQL and uses bulk upsert (`INSERT ... ON CONFLICT DO UPDATE`) for performance; SQLite falls back to `session.merge()`

### Data Sync

The `sync_sections_to_db(sections, source_used)` function in `scraper/load_data.py`:

- Atomically upserts colleges, departments, courses, and sections
- Purges CRNs not present in the current scrape run (stale data removal)
- Preserves existing department names when the new scrape provides empty names
- Merges time slots for duplicate section keys during deduplication

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `sqlite:///courses.db` | Database connection string. Supports SQLite (dev) and PostgreSQL (prod). Render's `postgres://` prefix is auto-corrected to `postgresql://`. |
| `TERM_CODE` | No | `144810` | Default Hijri term code for the scraper. |
| `MIN_SECTIONS_THRESHOLD` | No | `1000` | Minimum section count for the static HTML source to be considered valid. Falls back to dynamic API if below this. |
| `TELEGRAM_BOT_TOKEN` | No | (none) | Telegram bot token for sending scrape failure alerts. |
| `ADMIN_CHAT_ID` | No | (none) | Telegram chat ID for receiving alerts. |

The `.env` file is loaded automatically by `python-dotenv` in `database.py`. It is gitignored and should never be committed.

## Testing

**Framework:** `unittest` (standard library), run via `pytest` (must be installed separately)

```bash
# Install pytest (not in requirements.txt)
pip install pytest

# Run all tests
python -m pytest tests/

# Run specific test file
python -m pytest tests/test_pipeline.py

# Run with verbose output
python -m pytest tests/ -v
```

Tests use in-memory SQLite (`sqlite:///:memory:`) for isolation and `unittest.mock.patch` for external dependencies.

### Test Coverage

| Test File | What It Tests |
|-----------|---------------|
| `test_config.py` | College code derivation, sex codes, env int fallback |
| `test_dynamic_api_source.py` | DynamicAPISource.fetch_all (mocked fetcher) |
| `test_load_data.py` | sync_sections_to_db: upsert, CRN purge, dept name preservation |
| `test_normalizer.py` | Status normalization, row normalization, edge cases |
| `test_pipeline.py` | Pipeline: static success, fallback, all-fail, below-threshold |
| `test_scraping.py` | /api/scraping/last-update endpoint (no records, with records) |
| `test_source_base.py` | Source ABC cannot be instantiated |
| `test_static_html_source.py` | StaticHTMLSource: URL building, fixture parsing, error handling |
| `test_utils.py` | Telegram alerts: success, critical level, markdown escaping, missing env |

## Project Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── run_scraper.py             # CLI entry point for the scraper pipeline
├── database.py                # Database engine/session setup
├── models.py                  # SQLModel ORM models
├── schemas.py                 # Pydantic models for KFU API data parsing
├── utils.py                   # Helpers: time parsing, Telegram alerts
├── requirements.txt           # Python dependencies
├── schema.sql                 # Reference SQL DDL (SQLModel auto-creates tables at startup via main.py lifespan)
├── courses.db                 # Local SQLite database (gitignored)
├── .env                       # Environment variables (gitignored)
│
├── routers/
│   ├── colleges.py            # University structure endpoints
│   ├── schedules.py           # Schedule generator endpoint
│   └── scrape_status.py       # Scrape status endpoint
│
├── scraper/
│   ├── config.py              # Scraper configuration
│   ├── pipeline.py            # Orchestrator: static → dynamic → alerts
│   ├── normalizer.py          # Normalizes Arabic status/type fields
│   ├── fetcher.py             # Dynamic API source + DEPARTMENT_MAP
│   ├── load_data.py           # DB sync: atomic upsert + CRN purge
│   └── sources/
│       ├── base.py            # Source ABC (abstract interface)
│       ├── static_html.py     # StaticHTMLSource (primary)
│       └── dynamic_api.py     # DynamicAPISource (fallback)
│
└── tests/
    ├── fixtures/
    │   └── sample_static_page.html
    ├── test_config.py
    ├── test_dynamic_api_source.py
    ├── test_load_data.py
    ├── test_normalizer.py
    ├── test_pipeline.py
    ├── test_scraping.py
    ├── test_source_base.py
    ├── test_static_html_source.py
    └── test_utils.py
```

## Deployment

### Production (Render + Supabase)

- The backend is deployed on Render as a Web Service
- PostgreSQL database is hosted on Supabase
- For Supabase: use the Transaction mode URL (port 6543) to avoid the 15-connection session mode limit
- Set environment variables in Render dashboard: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`

### GitHub Actions

The scraper runs automatically via `.github/workflows/scraper.yml`:

- **Schedule:** Every 6 hours (`cron: "0 */6 * * *"`)
- **Manual:** Via `workflow_dispatch` trigger
- **Environment:** Python 3.12, Ubuntu latest
- **Secrets:** `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`

The workflow installs dependencies from `backend/requirements.txt` and runs `python backend/run_scraper.py`.
