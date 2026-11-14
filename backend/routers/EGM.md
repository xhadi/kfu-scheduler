# Routers

## Overview

This package holds the FastAPI HTTP routers for the KFU Scheduler backend.
Each module exposes one `APIRouter` named `router`. `backend/main.py` mounts
all three with `app.include_router(...)`.

- `colleges.py` serves the read-only catalog tree (college, department, course).
- `schedules.py` builds every conflict-free schedule for a list of courses.
- `scrape_status.py` reports the result of the latest scraper run.

All routes get a SQLModel `Session` through `Depends(get_db_session)` from
`backend/database.py`. The ORM models (`College`, `Department`, `Course`,
`Section`, `ScrapeStatus`) live in `backend/models.py`.

## Interface

### `colleges.py` (prefix `/api`, tag `University Structure`)

- `router` - `APIRouter(prefix="/api")` [colleges.py:router]
- `GET /api/colleges` -> `List[College]` [colleges.py:get_all_colleges]
- `GET /api/colleges/{college_id}/departments` -> `List[Department]`, filtered by `Department.college_id` [colleges.py:get_departments_by_college]
- `GET /api/departments/{dept_id}/courses` -> `List[Course]`, filtered by `Course.department_id` [colleges.py:get_courses_by_department]

### `schedules.py` (prefix `/api/schedules`, tag `Schedule Generator`)

- `router` - `APIRouter(prefix="/api/schedules")` [schedules.py:router]
- `ScheduleRequest` - Pydantic body: `course_ids: List[str]`, `gender: str | None = None` [schedules.py:ScheduleRequest]
- `LINKING_RULES` - dict of college ID to theory-to-practical section-number offset by gender: `"09"` (male 40, female 20) and `"07"` (male 50, female 40) [schedules.py:LINKING_RULES]
- `POST /api/schedules/generate` -> `{"total_options_found": int, "options": [{"schedule_id": int, "sections": [...]}]}`; each section has `crn`, `course_id`, `course_title`, `section_number`, `section_type`, `teacher`, `gender`, `time_slots`, `status` [schedules.py:generate_schedules]
- `sections_conflict(sec1, sec2) -> bool` - true if any two slots share a `day` and their `HH:MM` ranges overlap [schedules.py:sections_conflict]
- `bundles_conflict(bundle1, bundle2) -> bool` - true if any section pair across two bundles conflicts [schedules.py:bundles_conflict]
- `generate_combinations(course_index, current_schedule, course_bundles, all_valid_schedules, conflict)` - recursive backtracking that appends every conflict-free schedule to `all_valid_schedules` [schedules.py:generate_combinations]

### `scrape_status.py` (prefix `/api/scraping`, tag `Scrape Status`)

- `router` - `APIRouter(prefix="/api/scraping")` [scrape_status.py:router]
- `GET /api/scraping/last-update` -> `{"last_update": str | None, "status": str}` [scrape_status.py:get_last_scrape_update]

## Invariants

### Catalog routes

- An empty result returns HTTP 404, not an empty list. The code does not tell a missing college or department apart from one with no children [colleges.py:get_departments_by_college, colleges.py:get_courses_by_department].
- `GET /api/colleges` returns `[]` when the table is empty. It never returns 404 [colleges.py:get_all_colleges].
- Path IDs (`college_id`, `dept_id`) are strings and compared by exact match [colleges.py:get_departments_by_college, colleges.py:get_courses_by_department].

### Schedule generation

- An empty `course_ids` list returns HTTP 400 [schedules.py:generate_schedules].
- The college ID is the first two characters of each course ID (`course_id[:2]`). It selects the `LINKING_RULES` entry [schedules.py:generate_schedules].
- Linking applies only to colleges listed in `LINKING_RULES` (`"09"`, `"07"`). Other colleges treat every section, practicals included, as a standalone bundle [schedules.py:LINKING_RULES, schedules.py:generate_schedules].
- In a linked college, sections with `section_type == "عملي"` are never base sections. A practical appears only when paired with a theory section (`"نظري"`) whose number plus the gender offset, zero-padded with `zfill(2)`, matches its `section_number` [schedules.py:generate_schedules].
- A linked theory section with no matching practical, or with a non-numeric `section_number`, still becomes a standalone bundle. Linking does not drop it [schedules.py:generate_schedules].
- Gender filtering compares `Section.gender` to `request.gender` by exact equality, for base sections and practicals alike. Stored values are lowercase (`"male"`/`"female"`) [schedules.py:generate_schedules].
- A course with no sections returns HTTP 422. So does a course with no bundles after filtering, with one message for "no sections for the selected gender" and another for "no valid section pairs" [schedules.py:generate_schedules].
- `Section.time_slots` must be a JSON array of `{"day", "start", "end"}`, with times as zero-padded `HH:MM`. The conflict math slices `[:2]` and `[3:]` [schedules.py:sections_conflict].
- Conflict checks run per slot (same `day` and overlapping minutes). Ranges are half-open, so back-to-back slots do not conflict (`s1_sm < s2_em and s2_sm < s1_em`) [schedules.py:sections_conflict].
- Courses are sorted by bundle count, fewest first (MRV), before backtracking. The output keeps this sorted course order, not the request order [schedules.py:generate_schedules].
- The conflict matrix is keyed `(i, j, bi, bj)` with `i < j` over sorted course indexes. `generate_combinations` looks up `(earlier_course, current_course, earlier_bundle, current_bundle)` [schedules.py:generate_schedules, schedules.py:generate_combinations].
- `schedule_id` is 1-based and follows the order of enumeration [schedules.py:generate_schedules].
- `status` in the response comes from `Section.section_status`. `course_title` falls back to `"Unknown Course"` when the `Course` row is missing [schedules.py:generate_schedules].
- There is no cap on the number of combinations. The full result set is built in memory and returned in one response [schedules.py:generate_schedules].

### Scrape status

- The latest run is the `ScrapeStatus` row with the highest `id` [scrape_status.py:get_last_scrape_update].
- With no rows, the route returns `{"last_update": null, "status": "idle"}`. If the latest row has no `last_run_finished`, it returns `last_update: null` with that row's `status` [scrape_status.py:get_last_scrape_update].
- A naive `last_run_finished` is treated as UTC before `isoformat()` [scrape_status.py:get_last_scrape_update].
- This router has no authentication dependency. The route is public [scrape_status.py:router].

## Side Effects

- Every route reads the database through `Depends(get_db_session)`. That dependency opens a `Session(engine)` per request and closes it afterward [colleges.py:router, schedules.py:generate_schedules, scrape_status.py:get_last_scrape_update].
- No route in this package writes, commits, or deletes database rows.
- `generate_schedules` attaches a transient `_slots` attribute (parsed `time_slots` JSON) to loaded `Section` instances. It is not persisted [schedules.py:generate_schedules].
- `generate_schedules` runs one `SELECT` on `Section` and one `db.get(Course, ...)` per requested course ID [schedules.py:generate_schedules].
- No network calls, file I/O, or locks in this package.

## Verification

- Run from `backend/`: `.venv\Scripts\python -m pytest tests/`
- Route coverage: `tests/test_scraping.py` exercises `GET /api/scraping/last-update`. No tests currently cover the catalog or schedule routes.
