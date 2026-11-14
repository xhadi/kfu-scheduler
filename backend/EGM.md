# backend

## Overview

FastAPI + SQLModel service for the KFU Schedule Maker. The files in this
directory own the database engine, the ORM tables, the app entry point, the
raw-section parser, shared helpers, and the scraper CLI. HTTP routes live in
`routers/`; catalog ingestion lives in `scraper/`. Human-facing setup notes are
in [`Readme.md`](./Readme.md).

## Interface

### Subdirectories

- [`routers/`](./routers/EGM.md) - REST endpoints (catalog, schedule
  generator, scrape status).
- [`scraper/`](./scraper/EGM.md) - scraping pipeline, sources, normalizer, and
  DB sync.

### Database (`database.py`)

- `[database.py:normalize_database_url(raw_url) -> str]`
- `[database.py:DATABASE_URL]`, `[database.py:engine]`, `[database.py:BASE_DIR]`
- `[database.py:init_db(db_engine=None)]` - creates tables and indexes.
- `[database.py:get_db_session()]` - FastAPI session dependency.
- Env var: `DATABASE_URL` (`[database.py:os.getenv('DATABASE_URL')]`).

### App entry point (`main.py`)

- `[main.py:app]` - `FastAPI(title='KFU Schedule Maker API', lifespan=lifespan)`.
- `[main.py:lifespan]` - startup hook.
- `[main.py:origins]` - CORS allowlist: `http://localhost:5173`,
  `http://127.0.0.1:5173`, `http://localhost:3000`,
  `https://kfu-scheduler.web.app`, `https://kfu-scheduler.firebaseapp.com`.
- `[main.py:app.include_router]` - mounts `colleges.router`,
  `schedules.router`, `scrape_status.router`.
- `[main.py:root]` - `GET /` returns
  `{"status": "healthy", "message": "KFU Schedule Maker API is running!"}`.

### ORM tables (`models.py`)

| Class | Table | Key |
|---|---|---|
| `College` | `college` | `id: str` |
| `Department` | `department` | `id: str`, FK `college_id` → `college.id` |
| `Course` | `course` | `id: str`, FK `department_id` → `department.id` |
| `Section` | `section` | composite `(crn, section_number, course_id)` |
| `ScrapeStatus` | `scrapestatus` | `id` autoincrement integer |

- Relationships: `College.departments` ↔ `Department.college`,
  `Department.courses` ↔ `Course.department`, `Course.sections` ↔
  `Section.course`.

### Raw-data parsing (`schemas.py`)

- `[schemas.py:SectionData]` - Pydantic model over raw KFU JSON. Aliases:
  `CRN`, `Division`, `Activity`, `Teacher`, `DEPTCode`, `Course`,
  `Availability`, `College`, `DEPT`, `CourseTitle`, `Hours`. Derived fields:
  `gender`, `time_slots`, `college_id`.
- `[schemas.py:SectionData.parse_raw_university_data]` -
  `model_validator(mode='before')`.

### Helpers (`utils.py`)

- `[utils.py:parse_time_string(time_str) -> tuple[time, time]]`
- `[utils.py:send_telegram_alert(message, level='warning') -> bool]`
- Env vars: `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`.

### Scraper CLI (`run_scraper.py`)

- `[run_scraper.py:main()]`
- Flags: `--term` (default `config.DEFAULT_TERM_CODE`), `--dry-run`,
  `--force-purge` (defaults to true when env `FORCE_PURGE` is `"true"`).

### Reference DDL (`schema.sql`)

- Tables: `college`, `department`, `course`, `section`, `scrapestatus`.
- Indexes: `idx_section_course`, `idx_course_department`.

## Invariants

- **URL normalization**
  (`[database.py:normalize_database_url]`): trims whitespace and one pair of
  surrounding quotes. Empty or unset → `sqlite:///{BASE_DIR}/courses.db`.
  `postgres://` and `postgresql://` → `postgresql+psycopg2://`. Other URLs pass
  through.
- **Engine options** (`[database.py:engine]`): SQLite uses
  `check_same_thread=False`. Any other DB uses `NullPool` and
  `pool_pre_ping=True`.
- **Schema source of truth** (`[database.py:init_db]`): the live schema comes
  from SQLModel metadata only. `init_db` runs `create_all`, then
  `index.create(checkfirst=True)` for every declared index, so new indexes reach
  existing tables. `schema.sql` is never executed by Python code.
- **Startup** (`[main.py:lifespan]`): `init_db()` runs on every server start,
  before requests are served.
- **CORS** (`[main.py:CORSMiddleware]`): fixed origin list,
  `allow_credentials=True`, all methods and headers.
- **String keys** (`[models.py:College/Department/Course/Section]`): all IDs and
  `Section.section_number` are strings (e.g. `"09"`, `"0921-120"`, `"01"`).
- **Section key** (`[models.py:Section]`): composite PK
  `(crn, section_number, course_id)`; `course_id` is also an FK.
- **Time data** (`[models.py:Section.time_slots]`): a JSON string array of
  `{day, start, end}`. There are no separate day/time columns.
- **Gender values** (`[models.py:Section.gender]`): `"male"` or `"female"` by
  convention; the ORM has no constraint.
- **Declared indexes** (`[models.py:Course.__table_args__]`,
  `[models.py:Section.__table_args__]`): `idx_course_department`,
  `idx_section_course`.
- **Scrape history** (`[models.py:ScrapeStatus]`): status defaults to `idle`
  (convention `idle` / `running` / `completed` / `failed`); `source` defaults to
  `None` (convention `static_html` / `dynamic_api`).
- **College mapping**
  (`[schemas.py:parse_raw_university_data]`): `college_id` comes from
  `DEPARTMENT_MAP[DEPTCode]['college_id']`, else the caller's `college_id`,
  else `DEPTCode[:2]`, else `"unknown"`.
- **Gender mapping** (`[schemas.py:parse_raw_university_data]`): `"male"` only
  when `StudentsCode == "11"`; anything else is `"female"`.
- **Slot expansion** (`[schemas.py:parse_raw_university_data]`): `Days` is split
  on whitespace; each day gets one slot with the same `HH:MM` range. No days →
  `"[]"`.
- **Time parsing** (`[utils.py:parse_time_string]`): matches `HHMM-HHMM` after
  removing spaces. No match → `(00:00, 00:00)`.
- **Alerts** (`[utils.py:send_telegram_alert]`): returns `False` with no network
  call if `TELEGRAM_BOT_TOKEN` or `ADMIN_CHAT_ID` is missing, and `False` on any
  `requests.RequestException`. Message text is Markdown-escaped.
- **Scrape run lifecycle** (`[run_scraper.py:main]`): `init_db()` runs first,
  even for `--dry-run`. A new `ScrapeStatus` row is inserted as `running` on
  every run (history kept). Success sets `completed`, `source`,
  `total_sections_scraped`, and an optional purge-skipped note in
  `error_message`. Any exception sets `failed` and exits with code 1.

### `schema.sql` must mirror `models.py`

`schema.sql` is reference-only PostgreSQL DDL. It mirrors the ORM exactly:
the same columns, nullability, primary and foreign keys, and the two
indexes. It has no `UNIQUE`, `CHECK`, `ON DELETE CASCADE`, or server-side
`DEFAULT`; defaults are applied by SQLModel in Python. When `models.py`
changes, regenerate `schema.sql` (compile `CreateTable` / `CreateIndex` for
`SQLModel.metadata` with the `postgresql` dialect).

## Side Effects

- `[database.py:load_dotenv]` - loads `backend/.env` into the environment at
  import (does not override existing vars).
- `[database.py:engine]` - SQLite fallback creates `backend/courses.db` on first
  connect.
- `[database.py:init_db]` - DDL: `CREATE TABLE` / `CREATE INDEX` for missing
  objects.
- `[main.py:lifespan]` - prints `Initializing database tables...` and runs DDL
  on startup.
- `[run_scraper.py:main]` - inserts and updates `scrapestatus` rows (also on
  `--dry-run`); runs network scraping via `scraper.pipeline.Pipeline`; unless
  `--dry-run`, writes and may purge catalog rows via
  `scraper.load_data.sync_sections_to_db`; prints to stdout/stderr; calls
  `sys.exit(1)` on failure.
- `[run_scraper.py:main]` - when the purge is skipped, prints a note to stderr
  and sends a `warning` Telegram alert.
- `[utils.py:send_telegram_alert]` - HTTP POST to
  `https://api.telegram.org/bot{TOKEN}/sendMessage`, 10 s timeout.
- `[schemas.py]` - importing it imports `scraper.fetcher` for
  `DEPARTMENT_MAP`.

## Verification

- Run (from `backend/`): `.venv\Scripts\python -m pytest tests/`
