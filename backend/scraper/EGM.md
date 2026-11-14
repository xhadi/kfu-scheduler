# Scraper

## Overview

The scraper fetches the KFU course catalog for one term and syncs it into the
application database. It has four parts:

1. Pluggable sources (see `./sources/EGM.md`).
2. A fallback pipeline that picks the first acceptable source result and sends
   Telegram alerts.
3. A row normalizer.
4. A DB loader that deduplicates the rows, upserts them, and purges stale rows.

The CLI entry point is `backend/run_scraper.py`. It calls
`Pipeline(term).run()` and then
`sync_sections_to_db(result.sections, result.source_used, force_purge=...)`.

Modules import `schemas`, `models`, `database`, and `utils` from `backend/`.
Run code from `backend/`. `load_data.py` also adds `backend/` to `sys.path`
itself.

## Why

- Scraping runs from the CLI and GitHub Actions, not inside FastAPI: Render's free tier spins the server down before a long background scrape can finish. The API only reads.
- `COLLEGE_CODES` is derived from `fetcher.DEPARTMENT_MAP` so the static and dynamic sources cover exactly the same colleges.
- Upsert and purge share one transaction so a failed run never leaves partial data or deletes valid rows.
- Sections are purged by the full `(crn, section_number, course_id)` key because KFU reuses CRNs across terms; purging by CRN alone left previous-term rows behind.
- The purge is skipped when a run is below `PURGE_MIN_RATIO` of the current count because the dynamic fallback silently skips failed departments, so a partial scrape could wipe valid courses. `--force-purge` exists for real drops, such as a smaller new term.
- Warning alerts are throttled to one per 6 hours and successful runs send no alert, to avoid alert fatigue when the static page is down for a while. Critical alerts always go out.

## Interface

- Sources subpackage: [./sources/EGM.md](./sources/EGM.md)
  - `Source` ABC.
  - `StaticHTMLSource` (primary, `"static_html"`).
  - `DynamicAPISource` (fallback, `"dynamic_api"`).
- `config.py`
  - `STATIC_BASE_URL` [config.py:STATIC_BASE_URL]
  - `COLLEGE_CODES`: the sorted unique `college_id` values from
    `fetcher.DEPARTMENT_MAP` [config.py:COLLEGE_CODES]
  - `SEX_CODES = ["11", "12"]` [config.py:SEX_CODES]
  - `DEFAULT_TERM_CODE`: env `TERM_CODE`, default `"144810"`
    [config.py:DEFAULT_TERM_CODE]
  - `MIN_SECTIONS_THRESHOLD`: env, default `1000`
    [config.py:MIN_SECTIONS_THRESHOLD]
  - `PURGE_MIN_RATIO`: env, default `0.5` [config.py:PURGE_MIN_RATIO]
  - `REQUEST_DELAY_SECONDS = 1` [config.py:REQUEST_DELAY_SECONDS]
  - `MAX_RETRIES = 3` [config.py:MAX_RETRIES]
  - If an env value is invalid, the default is used
    [config.py:_env_int; config.py:_env_float].
- `fetcher.py` (legacy dynamic-API client)
  - `BASE_URL` (KFU `StudySchedules.svc/GetCoursesByDept`)
    [fetcher.py:BASE_URL]
  - `HIJRI_YEAR`: a mutable module global [fetcher.py:HIJRI_YEAR]
  - `GENDERS` [fetcher.py:GENDERS]
  - `DEPARTMENT_MAP`: KFU dept code ->
    `{college_id, dept_id, name}` [fetcher.py:DEPARTMENT_MAP]. It is also
    imported by `backend/schemas.py`.
  - `DATA_DIR` [fetcher.py:DATA_DIR]
  - `RAW_JSON_PATH` [fetcher.py:RAW_JSON_PATH]
  - `fetch_university_courses_data() -> str`: returns the JSON file path
    [fetcher.py:fetch_university_courses_data]
- `normalizer.py`
  - `STATUS_MAP` [normalizer.py:STATUS_MAP]
  - `normalize_status(raw_status) -> str` [normalizer.py:normalize_status]
  - `normalize_row(raw, source_name="unknown") -> SectionData`
    [normalizer.py:normalize_row]
- `pipeline.py`
  - `PipelineResult` (pydantic): `sections`, `source_used`,
    `fallback_reason`, `total_sections` [pipeline.py:PipelineResult]
  - `Pipeline(term_code, sources=None)` [pipeline.py:Pipeline]
  - `Pipeline.run() -> PipelineResult` [pipeline.py:Pipeline.run]
  - `PipelineError(Exception)` [pipeline.py:PipelineError]
- `load_data.py`
  - `SyncResult(purged, existing_sections, new_sections)` (NamedTuple)
    [load_data.py:SyncResult]
  - `sync_sections_to_db(sections, source_used, db_engine=engine, force_purge=False, min_ratio=config.PURGE_MIN_RATIO) -> SyncResult`
    [load_data.py:sync_sections_to_db]
  - `load_data_to_db(json_file_path)`: legacy loader for the dynamic-API JSON
    file [load_data.py:load_data_to_db]
  - Internal helpers: `_dedup_sections`, `_bulk_upsert`, `_purge_stale`,
    `_is_postgresql`.

## Invariants

- Pipeline source order and acceptance [pipeline.py:Pipeline.run]:
  - With no `sources` argument, the default order is
    `[StaticHTMLSource(), DynamicAPISource()]`. Both are imported lazily
    [pipeline.py:Pipeline.__init__].
  - The first source (index 0) is accepted only if it returns at least
    `config.MIN_SECTIONS_THRESHOLD` sections. A smaller result is discarded
    and a warning is sent.
  - Any later source is accepted if its result is non-empty. Its
    `fallback_reason` is always `"<sources[0].name> unavailable"`, even when
    the primary source only fell short of the threshold.
  - If every source fails or comes back empty, `run()` sends a `critical`
    alert and raises `PipelineError`. The message is "All sources failed"
    when any source raised. Otherwise it is "All sources returned empty".
- Warning alerts are rate-limited to one per 6 hours. The limit is kept per
  `Pipeline` instance, in memory (`_last_warning_time`)
  [pipeline.py:Pipeline._send_warning]. Critical alerts are not rate-limited.
- `normalize_row` mutates the `raw` dict in place
  [normalizer.py:normalize_row]:
  - `Availability` goes through `STATUS_MAP`, which maps the variants to
    `متاحة`, `ممتلئة`, `غير متاحة`. Unknown values are kept, stripped.
  - A blank `Teacher` becomes `"غير محدد"`.
  - The result is validated as `SectionData(**raw)`.
- Dedup in `sync_sections_to_db` [load_data.py:_dedup_sections]:
  - Colleges, departments, and courses are keyed by ID. The first occurrence
    wins.
  - Sections are keyed by the composite `(crn, section_number, course_id)`.
  - When a section key repeats, the `time_slots` JSON lists are merged and
    deduplicated by `(day, start, end)`.
- Purge gate [load_data.py:sync_sections_to_db]:
  - Purge runs only when `force_purge` is set or
    `new_count >= existing_count * min_ratio`.
  - `existing_count` is the current `Section` row count. With an empty DB,
    purge always runs.
  - Upserts always run, whether or not purge runs.
  - The default for `min_ratio` is bound to `config.PURGE_MIN_RATIO` when the
    module is imported.
- Purge scope and order [load_data.py:sync_sections_to_db; load_data.py:_purge_stale]:
  - Purge deletes every `Section`, `Course`, `Department`, and `College` whose
    key is not in this run.
  - It deletes children first so foreign keys stay valid.
  - Sections are matched on the full composite key, because KFU reuses CRNs
    across terms.
  - Deletes are batched in chunks of 500 keys.
- Upsert and purge run in one transaction (`with session.begin()`)
  [load_data.py:sync_sections_to_db]. A failure rolls back the whole sync.
- Backend choice [load_data.py:_is_postgresql; load_data.py:_bulk_upsert]:
  - PostgreSQL (driver name starts with `postgresql`) uses
    `INSERT ... ON CONFLICT DO UPDATE` on the primary keys.
  - Other backends (SQLite) use `session.merge()` for each row.
- A department with an empty name keeps its stored DB name in both upsert
  paths [load_data.py:sync_sections_to_db].
- The `source_used` argument of `sync_sections_to_db` is accepted but not
  used in the function body [load_data.py:sync_sections_to_db].
- `fetch_university_courses_data` logs a failed department/gender request
  and continues. It never raises on HTTP errors, so a partial result is
  possible [fetcher.py:fetch_university_courses_data].

## Side Effects

- Importing `fetcher.py` creates `scraper/data/` (`os.makedirs`)
  [fetcher.py:DATA_DIR]. `config.py` imports `fetcher`, so importing `config`
  does this too.
- `config.py` reads the env vars `TERM_CODE`, `MIN_SECTIONS_THRESHOLD`, and
  `PURGE_MIN_RATIO` at import time [config.py].
- `fetch_university_courses_data` [fetcher.py:fetch_university_courses_data]:
  - Sends HTTP `GET` to `BASE_URL` for each department in `DEPARTMENT_MAP`
    and each gender (timeout 10 s).
  - Sleeps 2 s after each successful request.
  - Prints progress to stdout.
  - Overwrites `scraper/data/university_courses_data.json`.
- `Pipeline` calls `utils.send_telegram_alert` with level `warning` or
  `critical`. These are outbound Telegram HTTP calls, and they are skipped
  when `TELEGRAM_BOT_TOKEN`/`ADMIN_CHAT_ID` are unset
  [pipeline.py:Pipeline._send_warning; pipeline.py:Pipeline.run].
- `sync_sections_to_db` writes to the `College`, `Department`, `Course`, and
  `Section` tables through `database.engine` (`DATABASE_URL`). It upserts
  rows and may delete them [load_data.py:sync_sections_to_db].
- `load_data_to_db` [load_data.py:load_data_to_db]:
  - Reads a JSON file.
  - Prints the rows it skips as invalid.
  - Calls `sync_sections_to_db`. That call can purge rows (see Invariants).

## Verification

- Run (from `backend/`): `.venv\Scripts\python -m pytest tests/`
- Targeted: `.venv\Scripts\python -m pytest tests/test_pipeline.py tests/test_load_data.py tests/test_normalizer.py tests/test_config.py`
