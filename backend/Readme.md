# KFU Scheduler Backend

FastAPI + SQLModel backend for the **KFU Schedule Maker**. Provides a REST API for browsing university structure (colleges, departments, courses), generating conflict-free schedule combinations, and tracking scraping execution logs. Includes a dual-source scraping pipeline that fetches and synchronizes course data from King Faisal University (KFU) systems.

---

## Features

- **University Catalog API**: Complete college, department, and course listings.
- **Combinatorial Schedule Generator**: Generates all valid non-conflicting schedules using recursive backtracking with the **MRV (Minimum Remaining Values)** heuristic and pre-computed conflict matrices.
- **College Linking Rules**: Auto-pairs theory sections with practical/lab sections based on college offset rules (e.g., CCSIT and Agricultural Sciences).
- **Resilient Scraper Pipeline**: Dual-strategy catalog ingestion featuring a primary **Static HTML parser** and a fallback **Dynamic WCF API client** with Telegram alert reporting.
- **Multi-Database Support**: Dual support for local **SQLite** (development) and **PostgreSQL / Supabase** (production bulk upserts).

---

## Quick Start

### Prerequisites
- **Python 3.12+** (supported on Windows, macOS, Linux, and WSL)
- **pip** package manager

### Multi-Platform Installation & Execution

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows (CMD / PowerShell):
.venv\Scripts\activate
# macOS / Linux / WSL:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy example environment configuration
# macOS / Linux / WSL / PowerShell:
cp .env.example .env
# Windows Command Prompt (CMD):
copy .env.example .env

# 6. Run local dev server (auto-creates SQLite database on startup)
uvicorn main:app --reload
```

The API server runs on `http://localhost:8000`. The Vite frontend dev server (port `5173`) proxies `/api` requests to this backend.

### Multi-Platform Compatibility Notes

- **Path Handling**: All internal paths use Python `pathlib.Path` for native cross-platform compatibility across Windows backslashes (`\`) and POSIX forward slashes (`/`).
- **Database Engine**: Local SQLite (`courses.db`) operates identically across Windows, macOS, and Linux without native binary dependencies. Production uses PostgreSQL (Supabase).
- **Encoding**: Network requests and JSON loaders explicitly enforce `UTF-8` with fallback decoding for Arabic `Windows-1256` character sets.
- **WSL (Windows Subsystem for Linux)**: When running inside WSL, use Linux virtual environment paths (`source .venv/bin/activate`).


### Running the Scraper CLI

```bash
# Fetch latest catalog data and sync to database
python run_scraper.py --term 144810

# Dry-run mode: fetch and validate without writing to database
python run_scraper.py --term 144810 --dry-run
```

---

## API Endpoints

### 1. University Structure

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/colleges` | List all colleges |
| `GET` | `/api/colleges/{college_id}/departments` | List departments for a specific college |
| `GET` | `/api/departments/{dept_id}/courses` | List courses for a specific department |

#### GET `/api/colleges`
```json
[
  {
    "id": "09",
    "name": "كلية علوم الحاسب وتقنية المعلومات"
  },
  {
    "id": "01",
    "name": "كلية العلوم الزراعية والأغذية"
  }
]
```

#### GET `/api/colleges/09/departments`
```json
[
  {
    "id": "0911",
    "name": "علوم الحاسب",
    "college_id": "09"
  },
  {
    "id": "0912",
    "name": "نظم المعلومات",
    "college_id": "09"
  }
]
```

#### GET `/api/departments/0911/courses`
```json
[
  {
    "id": "0911-101",
    "title": "مقدمة في البرمجة",
    "hours": 4,
    "department_id": "0911"
  }
]
```

---

### 2. Schedule Generator

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/schedules/generate` | Generate conflict-free schedule combinations |

#### Request Body
```json
{
  "course_ids": ["0911-101", "0912-210"],
  "gender": "male"
}
```

#### Response Payload
```json
{
  "total_options_found": 12,
  "options": [
    {
      "schedule_id": 1,
      "sections": [
        {
          "crn": "53210",
          "course_id": "0911-101",
          "course_title": "مقدمة في البرمجة",
          "section_number": "01",
          "section_type": "نظري",
          "teacher": "د. أحمد علي",
          "gender": "male",
          "time_slots": [
            {
              "day": "ح",
              "start": "08:00",
              "end": "09:15"
            },
            {
              "day": "ث",
              "start": "08:00",
              "end": "09:15"
            }
          ],
          "status": "متاحة"
        }
      ]
    }
  ]
}
```

#### HTTP Status & Error Codes

| Status | Condition | Example Response |
|---|---|---|
| `400` | Missing required payload fields | `{"detail": "Please select at least one course."}` |
| `422` | Requested course has no sections available | `{"detail": "Course '...' has no sections available for the selected gender."}` |

---

### 3. Monitoring & Health Check

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/scraping/last-update` | Get timestamp and status of the latest scraper run |
| `GET` | `/` | Health check endpoint |

#### GET `/api/scraping/last-update`
```json
{
  "last_update": "2026-08-07T12:00:00Z",
  "status": "completed"
}
```

#### GET `/`
```json
{
  "status": "healthy",
  "message": "KFU Schedule Maker API is running!"
}
```

---

## Architecture & Core Algorithms

### 1. Schedule Generator Engine

The schedule generator (`routers/schedules.py`) converts requested courses into valid schedule options through a 5-step process:

1. **Section Fetching & Pre-Filtering**: Queries database sections matching `course_id` and selected `gender`.
2. **Theory-to-Practical Section Linking**: For colleges with strict section pairing rules (`LINKING_RULES`), theory sections are automatically linked with their matching lab sections by applying numerical section number offsets (e.g., Theory `01` + offset `40` = Lab `41`).
3. **MRV (Minimum Remaining Values) Sorting**: Sorts requested courses by the number of valid bundles ascending to maximize early prune speed in backtracking.
4. **Pre-Computed Conflict Matrix**: Computes time overlap conflicts across all course bundle pairs prior to recursion. Overlaps are checked per time slot (`day`, `start`, `end`).
5. **Recursive Backtracking**: Explores non-conflicting bundle combinations and constructs formatted schedule response objects.

### 2. Scraper Pipeline & Strategy Pattern

The scraper system (`scraper/pipeline.py`) orchestrates catalog data retrieval using the Strategy pattern:

```
                  ┌────────────────────────┐
                  │      Pipeline.run()    │
                  └───────────┬────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
   ┌───────────────────────┐     ┌───────────────────────┐
   │   StaticHTMLSource    │     │   DynamicAPISource    │
   │  (Primary Web Scrape) │     │  (Fallback WCF API)   │
   └───────────┬───────────┘     └───────────┬───────────┘
               │                             │
    Sections >= 1000?                Returns valid JSON?
       ├── Yes ──> Success              ├── Yes ──> Success
       └── No  ──> Trigger Fallback ────└── No  ──> Send Telegram Alert
```

- **StaticHTMLSource** (`scraper/sources/static_html.py`): Primary source. Downloads KFU static HTML schedule pages, parses Arabic tables with BeautifulSoup, and uses regex byte-offset position matching to map section tables to parent department headers.
- **DynamicAPISource** (`scraper/sources/dynamic_api.py`): Fallback source. Queries KFU's WCF endpoints (`GetCoursesByDept`) per department and gender code.
- **Alert System** (`utils.py`): Sends Markdown-formatted alerts to Telegram (`TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`) on pipeline warnings or critical failures, rate-limited to 6 hours.

---

## Database Architecture

### Data Models (SQLModel / ORM)

Located in `models.py`:

- **College**: `id` (PK, e.g. `"09"`), `name` (Arabic title).
- **Department**: `id` (PK, e.g. `"0911"`), `name`, `college_id` (FK -> `college.id`).
- **Course**: `id` (PK, e.g. `"0911-101"`), `title`, `hours`, `department_id` (FK -> `department.id`).
- **Section**: Composite Primary Key `(crn, section_number, course_id)`. Stores `section_type`, `section_status`, `teacher`, `gender` (`"male"` / `"female"`), and `time_slots` (JSON string array `[{"day":"ح","start":"09:00","end":"10:15"}]`).
- **ScrapeStatus**: Auto-increment `id`, `status` (`"idle"` / `"running"` / `"completed"` / `"failed"`), `source`, `last_run_started`, `last_run_finished`, `total_sections_scraped`, and `error_message`.

### Database Engines & Synchronization

- **SQLite** (Development): Default local engine (`courses.db`). Sync operations use `Session.merge()`.
- **PostgreSQL** (Production): Deployed on Supabase. `scraper/load_data.py` auto-detects PostgreSQL driver and executes high-performance bulk upserts via `INSERT ... ON CONFLICT DO UPDATE`.
- **Atomic Sync**: `sync_sections_to_db()` automatically purges CRNs not present in the latest scrape run to maintain fresh catalog state.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | `sqlite:///courses.db` | Connection string. Auto-converts legacy Render `postgres://` to `postgresql://`. |
| `TERM_CODE` | No | `144810` | Hijri term code for catalog scraping. |
| `MIN_SECTIONS_THRESHOLD` | No | `1000` | Minimum section count threshold for primary static HTML scraper validation. |
| `TELEGRAM_BOT_TOKEN` | No | *None* | Bot token for Telegram error notifications. |
| `ADMIN_CHAT_ID` | No | *None* | Target chat ID for Telegram alert delivery. |

---

## Testing

Backend tests are written using standard Python `unittest` and run via `pytest`.

```bash
# Run full test suite
python -m pytest tests/

# Run specific test file
python -m pytest tests/test_schedules.py

# Run with verbose output
python -m pytest tests/ -v
```

### Test Suite Structure

| Test File | Description |
|---|---|
| [test_config.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_config.py) | Tests college code extraction and fallback environment integer parsing. |
| [test_dynamic_api_source.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_dynamic_api_source.py) | Mocks dynamic API client requests and validates SectionData output. |
| [test_load_data.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_load_data.py) | Tests database sync, entity deduplication, CRN purge, and department name preservation. |
| [test_normalizer.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_normalizer.py) | Validates status string normalization and teacher fallback logic. |
| [test_pipeline.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_pipeline.py) | Tests primary source execution, threshold fallback, and alert triggers. |
| [test_scraping.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_scraping.py) | Tests `/api/scraping/last-update` REST endpoint behavior. |
| [test_source_base.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_source_base.py) | Verifies `Source` ABC instantiation constraints. |
| [test_static_html_source.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_static_html_source.py) | Tests static HTML parsing using local HTML sample fixtures. |
| [test_utils.py](file:///c:/Users/User/Coding/kfu-scheduler/backend/tests/test_utils.py) | Tests Telegram message formatting, Markdown escaping, and API payloads. |

---

## Project Structure

```
backend/
├── main.py                    # FastAPI application entry point & CORS configuration
├── run_scraper.py             # CLI entry point for running the scraper pipeline
├── database.py                # Database engine configuration & session dependency
├── models.py                  # SQLModel ORM table definitions
├── schemas.py                 # Pydantic models & raw data parsing logic
├── utils.py                   # Time parsing & Telegram alert helpers
├── requirements.txt           # Python dependencies
├── schema.sql                 # Reference SQL DDL definition
├── .env.example               # Template environment configuration file
│
├── routers/
│   ├── colleges.py            # University structure REST endpoints
│   ├── schedules.py           # Combinatorial schedule generator endpoint
│   └── scrape_status.py       # Scraper monitoring endpoint
│
├── scraper/
│   ├── config.py              # Scraper constants & threshold configuration
│   ├── pipeline.py            # Fallback orchestrator & threshold validator
│   ├── normalizer.py          # Data normalization utilities
│   ├── fetcher.py             # Dynamic API client & department mapping
│   ├── load_data.py           # Database sync, deduplication & bulk upsert logic
│   └── sources/
│       ├── base.py            # Abstract Base Class for sources
│       ├── static_html.py     # Primary HTML scraper implementation
│       └── dynamic_api.py     # Fallback API source implementation
│
└── tests/
    ├── fixtures/              # Sample HTML page fixtures
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

---

## Deployment & CI/CD

### Production (Render + Supabase PostgreSQL)

- Deployed as a **Render Web Service** running `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Database hosted on **Supabase PostgreSQL**. Note: Use the **Transaction Pooler URL** (`port 6543`) in `DATABASE_URL` to handle concurrent connections smoothly.

### Automated GitHub Actions Workflow

Data scraping is automated via `.github/workflows/scraper.yml`:
- **Schedule**: Executes automatically every 6 hours (`cron: "0 */6 * * *"`).
- **Manual Trigger**: Supports manual runs via `workflow_dispatch`.
- Runs `python backend/run_scraper.py --term 144810` against the production `DATABASE_URL`.
