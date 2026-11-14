# api

## Overview

Thin HTTP client for the FastAPI backend. Every backend call made by the
frontend goes through this module. Each function issues one `fetch` request,
throws an `Error` on a non-2xx response, and returns the parsed JSON body.

## Interface

- `API_BASE` (module-private) [scheduleApi.js:API_BASE]: resolved base URL.
  Order: `import.meta.env.VITE_API_BASE_URL`, else `"/api"` in Vite dev mode
  (`import.meta.env.DEV`), else `https://kfu-schedular-api.onrender.com/api`.
- `fetchColleges()` [scheduleApi.js:fetchColleges]: `GET {API_BASE}/colleges`.
- `fetchDepartments(collegeId)` [scheduleApi.js:fetchDepartments]:
  `GET {API_BASE}/colleges/{collegeId}/departments`.
- `fetchCourses(deptId)` [scheduleApi.js:fetchCourses]:
  `GET {API_BASE}/departments/{deptId}/courses`.
- `generateSchedules(courseIds, gender)` [scheduleApi.js:generateSchedules]:
  `POST {API_BASE}/schedules/generate` with JSON body
  `{ course_ids: courseIds, gender }`.
- `fetchScrapeStatus()` [scheduleApi.js:fetchScrapeStatus]:
  `GET {API_BASE}/scraping/last-update` (served by
  `backend/routers/scrape_status.py`).

## Invariants

- All functions are `async` and return `res.json()` only when `res.ok`;
  otherwise they throw [scheduleApi.js:fetchColleges, fetchDepartments,
  fetchCourses, fetchScrapeStatus].
- `generateSchedules` surfaces the backend's `detail` field as the error
  message. If the error body is not JSON, it falls back to `'Network error'`,
  then to `'Failed to generate schedules'` [scheduleApi.js:generateSchedules].
- The request body keys for schedule generation are snake_case
  (`course_ids`, `gender`) to match the backend schema
  [scheduleApi.js:generateSchedules].
- No retries, timeouts, caching, or auth headers are applied here; callers own
  those concerns [scheduleApi.js].

## Side Effects

- Network: outbound `fetch` calls to the backend API at `API_BASE`
  [scheduleApi.js:API_BASE].
- In dev, relative `/api` requests rely on the Vite dev-server proxy to
  `localhost:8000` [scheduleApi.js:API_BASE].

## Verification

- Run from `frontend/`: `npm run lint`
- Run from `frontend/` (Windows CMD/PowerShell, not WSL): `npm run build`
