# KFU Scheduler

## Commands

From `frontend/`:
- `npm run dev` — Vite dev server (port 5173, proxies `/api` → localhost:8000)
- `npm run lint` — ESLint (no typecheck config, no test runner)
- `npm run build` — **must run from Windows CMD/PowerShell, not WSL** (native binary issue with rolldown/tailwindcss-oxide)

From `backend/` (Windows venv: `.venv\Scripts\python`):
- `uvicorn main:app --reload` — start API server (port 8000)
- `python run_scraper.py --term 144810` — run scraper pipeline (primary entry point)
- `python run_scraper.py --term 144810 --dry-run` — fetch only, skip catalog sync (still runs `init_db` and writes a `ScrapeStatus` row)
- `python run_scraper.py --term 144810 --force-purge` — purge stale rows even if the run is much smaller than the DB (also via env `FORCE_PURGE=true`)
- `python -m pytest tests/` — run backend tests (unittest-based, uses FastAPI TestClient)
- `database.init_db()` creates tables (`SQLModel.metadata.create_all`) and any missing indexes; it is called by the `main.py` lifespan and by `run_scraper.py`

## API Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/colleges` | GET | All colleges |
| `/api/colleges/{id}/departments` | GET | Departments by college |
| `/api/departments/{id}/courses` | GET | Courses by department |
| `/api/schedules/generate` | POST | Generate schedules (`course_ids`, `gender`) |
| `/api/scraping/last-update` | GET | Latest scrape run (`last_update`, `status`); public, no auth |
| `/` | GET | Health check |

There are no admin endpoints. Scraping is triggered only via the `run_scraper.py` CLI or GitHub Actions.

## Architecture

### Backend (`backend/`)
- FastAPI + SQLModel + SQLite (`courses.db`, created on startup via lifespan)
- `Section` composite PK: `(crn, section_number, course_id)` — all are **strings**
- `time_slots` is a JSON string field: `[{"day":"ح","start":"09:00","end":"10:15"}, ...]` — day abbreviations are Arabic (`ح`,`ن`,`ث`,`ر`,`خ`), times are `HH:MM`
- `days`/`start_time`/`end_time` no longer exist as separate fields — all time data lives in `time_slots`
- `gender` stored as lowercase string (`"male"`/`"female"`), not the `GenderEnum`
- `section_type` raw values come from the university API (e.g., `"نظري"`, `"عملي"`, `"ا ختياري"`)
- `status` field maps to Arabic values: `متاحة`, `ممتلئة`, `غير متاحة`
- Schedule generator: recursive backtracking with MRV heuristic. Theory sections link to practicals via `LINKING_RULES` offsets per college in `routers/schedules.py`
- Conflict detection iterates per-slot (day + time pair), not per-section
- `schemas.py` has Pydantic model `SectionData` that parses raw KFU API JSON (aliases like `"CRN"`, `"Division"`, `"Activity"`, `"Availability"`)
- `utils.py` has `parse_time_string` for KFU's `"0900-1015"` time format
- `DEPARTMENT_MAP` in `scraper/fetcher.py` maps raw KFU dept codes to college/dept IDs

### Scraper (`backend/scraper/`)
- **Source-adapter architecture**: `Source` ABC in `sources/base.py`, two implementations:
  - `StaticHTMLSource` (`sources/static_html.py`) — primary, parses KFU's Arabic HTML pages
  - `DynamicAPISource` (`sources/dynamic_api.py`) — fallback, wraps `fetcher.py`
- **Pipeline** (`pipeline.py`): tries static → falls back to dynamic → sends Telegram alerts on failure
- **Normalizer** (`normalizer.py`): normalizes `Availability` (status) and blank `Teacher` (→ `غير محدد`) before validation
- **Config** (`config.py`): `STATIC_BASE_URL`, `COLLEGE_CODES`, `SEX_CODES`, `DEFAULT_TERM_CODE` (env `TERM_CODE`), `MIN_SECTIONS_THRESHOLD`, `PURGE_MIN_RATIO`, `REQUEST_DELAY_SECONDS`, `MAX_RETRIES`
- **CLI** (`run_scraper.py`): `--term`, `--dry-run`, `--force-purge` flags; creates `ScrapeStatus` row per run (history preserved)
- **GitHub Actions** (`.github/workflows/scraper.yml`): runs every 6 hours on a self-hosted Linux runner, uses `DATABASE_URL` secret; manual dispatch accepts `term_code` and `force_purge`
- **Load data** (`load_data.py`): `sync_sections_to_db` upserts and purges in one transaction. Purge removes sections (matched on the full composite key), then courses, departments, and colleges missing from the run — but is skipped when the run has fewer than `PURGE_MIN_RATIO` × existing sections, unless forced. PostgreSQL uses bulk upsert (`INSERT ... ON CONFLICT DO UPDATE`), SQLite uses `session.merge()`
- **Telegram alerts** (`utils.py`): `send_telegram_alert(message, level)` — levels are `"warning"` and `"critical"`

### Database
- `DATABASE_URL` env var (defaults to SQLite `courses.db`)
- `.env` file loaded via `python-dotenv` in `database.py`
- Supabase PostgreSQL uses bulk upsert for fast writes
- `ScrapeStatus` table: auto-increment ID, each run inserts a new row (history preserved)
- `database.py` rewrites `postgres://` and `postgresql://` to `postgresql+psycopg2://` (pins the driver) and uses `NullPool` for PostgreSQL
- `backend/schema.sql` is reference-only and mirrors `models.py` (never executed; the live schema comes from `init_db`) — regenerate it when models change

### Frontend (`frontend/`)
- React 19 + Vite 8 + JSX (not TSX) + Tailwind v4 via `@tailwindcss/vite` plugin
- `@custom-variant dark (&:where(.dark, .dark *))` — class-based dark mode (Tailwind v4 defaults to media-based)
- Flash-prevention inline script in `index.html` reads `localStorage` before React mounts (key: `kfu-theme`)
- **No router** — two-step flow via `ScheduleContext.step` (1 = course selection, 2 = results)
- Three contexts: `ThemeContext` (light/dark, localStorage `kfu-theme`), `UiTextContext` (Arabic-only UI strings, always RTL), `ScheduleContext` (gender, courses, results, filters, navigation)
- `useCourseCatalog` hook (`src/hooks/useCourseCatalog.js`) loads the full college→dept→course tree on mount
- UI text strings at `src/uiText.js` (Arabic-only, consumed via `useUiText()` hook)
- `ScheduleContext.filteredOptions` applies client-side filters after generation: day-off, instructor, CRN, availability
- Day-off filter maps English keys → Arabic abbreviations via `KEY_TO_ABBREV` (e.g., `sun→ح`)
- API response returns `time_slots` array; frontend flattens it into per-slot items for timetable rendering (one block per day+time combo)
- Results paginated at 50 per page with windowed page numbers (5 visible)
- Status shown as colored left border (green=available, amber=full, red=not available); status text not displayed
- Timetable grid: 5-day (Sun–Thu, no Saturday), 12-hour format

## EGM Contracts

Each code folder has an `EGM.md` contract (Interface, Invariants, Side Effects, Verification); the root `EGM.md` is the system blueprint and links to all of them.
- Read the folder's `EGM.md` before changing code there.
- A contract's `## Why` section records design rationale taken from past specs; keep it accurate when the code changes.
- When a change alters a folder's public symbols, routes, invariants, or side effects, update that folder's `EGM.md` in the same commit.
- Folders without a contract: `backend/tests/`, `backend/scraper/data/`, `frontend/public/`, `frontend/src/assets/`.
- Human-facing docs stay in `README.md`, `backend/Readme.md`, `frontend/Readme.md`.

## Gotchas

- **No Saturday** in KFU schedule — Sunday through Thursday only
- **`npm run build` fails in WSL** — use Windows CMD/PowerShell
- **No lint CI, no test CI, no typecheck config** — `.github/workflows/` has only Firebase Hosting deploys (live on push to `main`, preview on PRs) and the scraper cron
- `docs/` and `graphify-out/` are in `.gitignore` — do not commit them (`AGENTS.md` and the `EGM.md` contracts are tracked)
- ESLint `react-refresh/only-export-components` rule allows specific hook exports listed in `eslint.config.js`
- Theme has no `system` option — only light/dark toggle
- `Section.section_number` is a **string** PK (e.g., `"01"`), not an integer — the linking logic converts to int for offset math then formats back with `zfill(2)`
- Venv is Windows-native (`.venv/Scripts/`) — Python commands must run via `cmd.exe` from WSL
- `DATABASE_URL` env var defaults to SQLite (`courses.db`); production uses PostgreSQL (`psycopg2-binary`; `database.py` rewrites the URL to `postgresql+psycopg2://`)
- Frontend deploys to Firebase Hosting (`kfu-scheduler` project); `dist/` is the build output
- `LINKING_RULES` only covers colleges `"09"` (CCSIT) and `"07"` (Agricultural) — other colleges have no theory-to-practical linking
- Supabase connection pool: use Transaction mode URL (port 6543) for production to avoid the 15-connection session mode limit
- Static HTML parser extracts department names per-block using positional matching (nearest preceding القسم : line by character offset), not from a name-to-code lookup
- `college_id` fallback: if `DEPTCode` not in `DEPARTMENT_MAP`, uses the page's college code (from URL), not the dept prefix
- `.env` file in `backend/` is loaded automatically by `python-dotenv` — never commit it (it's in `.gitignore`)
