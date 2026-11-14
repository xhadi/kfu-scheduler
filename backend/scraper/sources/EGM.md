# Scraper Sources

## Overview

Source adapters for the KFU course catalog. Each adapter implements the
`Source` interface and returns a flat list of validated `SectionData` rows
for one term, covering every configured college and gender.
`../pipeline.py` tries the adapters in order: `StaticHTMLSource` first, then
`DynamicAPISource` as the fallback.

All imports are absolute (`from schemas import ...`,
`from scraper import ...`), so `backend/` must be on `sys.path`. Run code from
`backend/`.

## Interface

- `Source` (ABC) [base.py:Source]
  - `name: str` is a class attribute. The pipeline reports it as `source_used`.
  - `fetch_all(term_code: str) -> List[SectionData]` is abstract
    [base.py:Source.fetch_all]. It returns every section for the term and
    raises on failure.
- `StaticHTMLSource(Source)`, `name = "static_html"`
  [static_html.py:StaticHTMLSource]. This is the primary source. It parses
  KFU's public Arabic HTML schedule pages.
  - `fetch_all(term_code)` [static_html.py:StaticHTMLSource.fetch_all] loops
    over `config.COLLEGE_CODES` x `config.SEX_CODES` and fetches one page per
    pair.
  - `_build_url(term_code, college_code, sex_code)`
    [static_html.py:StaticHTMLSource._build_url] returns
    `config.STATIC_BASE_URL?p_trm_code=..&p_col_code=..&p_sex_code=..`.
  - `_fetch_page(...)` [static_html.py:StaticHTMLSource._fetch_page] does the
    HTTP fetch and decoding, then calls `_parse_page`.
  - `_parse_page(html, sex_code, college_code="")`
    [static_html.py:StaticHTMLSource._parse_page] turns HTML into
    `SectionData`. Tests call it directly on fixture HTML.
  - `_map_headers(headers) -> dict[int, str]`
    [static_html.py:StaticHTMLSource._map_headers] maps Arabic column labels
    (`رقم المقرر`, `CRN`, `الشعبة`, `حالة الشعبة`, `اسم المقرر`, `ساعات`,
    `الأيام`, `النشاط`, `الوقت`, `مدرس المادة`) to the raw keys `Course`,
    `CRN`, `Division`, `Availability`, `CourseTitle`, `Hours`, `Days`,
    `Activity`, `Time`, `Teacher`.
- `DynamicAPISource(Source)`, `name = "dynamic_api"`
  [dynamic_api.py:DynamicAPISource]. This is the fallback source. It wraps
  `scraper.fetcher.fetch_university_courses_data` (the KFU WCF JSON service).
  - `fetch_all(term_code)` [dynamic_api.py:DynamicAPISource.fetch_all] calls
    the fetcher, reads the JSON file it wrote, and returns
    `[SectionData(**row) for row in raw_rows]`.

## Invariants

- Every adapter must return `List[SectionData]` (from `backend/schemas.py`)
  and must raise on a hard failure. It must not return a partial list
  silently [base.py:Source.fetch_all]. `Pipeline.run` relies on this.
- The `name` values `"static_html"` and `"dynamic_api"` are stored as
  `source_used`. Treat them as stable identifiers
  [static_html.py:StaticHTMLSource; dynamic_api.py:DynamicAPISource].
- Static parsing depends on the page layout
  [static_html.py:StaticHTMLSource._parse_page]:
  - It needs at least one `<table class="normaltxt">`. Otherwise it raises
    `ValueError("No table with class 'normaltxt' found...")`.
  - The first `normaltxt` table is the header table. Its `<td>` labels must
    map through `_map_headers`. Otherwise it raises
    `ValueError("Unrecognized column headers...")`.
  - Each data table gets the department name (`DEPT`) from the nearest
    preceding `القسم :` match, found by its character offset in the raw HTML.
    It does not use a name-to-code lookup.
  - `College` is the first `<td>` that matches `الكلية :`.
  - `DEPTCode` is the course-ID prefix before the first `-`.
  - `college_id` is the page's college code from the URL.
    `StudentsCode` is the `sex_code`.
  - Rows with too few cells (`len(cells) <= max(header_map)`) are skipped.
  - A row that fails `normalize_row`/`SectionData` validation is counted and
    skipped. One bad row never fails the page.
- Static decoding tries UTF-8 first. If that fails, it falls back to
  `windows-1256` with `errors="replace"`
  [static_html.py:StaticHTMLSource._fetch_page].
- Static retry [static_html.py:StaticHTMLSource.fetch_all]:
  - Each college/gender page gets up to `config.MAX_RETRIES` attempts, with a
    backoff of `attempt * 2` seconds.
  - If the last attempt fails, that exception is re-raised. The whole
    `fetch_all` call aborts and earlier pages are discarded.
- `DynamicAPISource.fetch_all` sets the fetcher's module global
  `fetcher.HIJRI_YEAR = term_code[:4]` before fetching
  [dynamic_api.py:DynamicAPISource.fetch_all]. The fetcher ignores the term
  suffix. It skips failed department requests and does not raise
  (see `../EGM.md`).
- `DynamicAPISource` builds rows with `SectionData(**row)` and does not call
  `normalize_row` [dynamic_api.py:DynamicAPISource.fetch_all]. One invalid row
  raises and fails the whole fetch.

## Side Effects

- Static network calls [static_html.py:StaticHTMLSource._fetch_page]:
  - Each page uses a new `requests.Session` with a browser `User-Agent`.
  - It first sends an unchecked cookie-priming `GET https://ssb-ar.kfu.edu.sa/`
    (timeout 20 s).
  - Then it sends `GET` to the page URL with a `Referer` header
    (timeout 20 s) and calls `raise_for_status()`.
- Static sleeps: `config.REQUEST_DELAY_SECONDS` after each college/gender
  pair, plus the retry backoff [static_html.py:StaticHTMLSource.fetch_all].
- Static stdout output: the redirect history on `TooManyRedirects`, the
  request-failure messages, and the count of skipped malformed rows
  [static_html.py:StaticHTMLSource._fetch_page; _parse_page].
- Dynamic: mutates `scraper.fetcher.HIJRI_YEAR` (process-global). It also
  triggers the fetcher's HTTP calls and its write to
  `scraper/data/university_courses_data.json`, then reads that file back
  [dynamic_api.py:DynamicAPISource.fetch_all].

## Verification

- Run (from `backend/`): `.venv\Scripts\python -m pytest tests/`
- Targeted: `.venv\Scripts\python -m pytest tests/test_source_base.py tests/test_static_html_source.py tests/test_dynamic_api_source.py`
