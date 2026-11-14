# hooks

## Overview

Data-loading React hooks that wrap the `api` client. `useCourseCatalog` loads
the full college, department, and course tree on mount and offers
client-side search. `useScrapeStatus` loads the latest scraper run time and
caches it in `sessionStorage`.

## Interface

- `useCourseCatalog()` [useCourseCatalog.js:useCourseCatalog]: returns
  `{ catalog, colleges, loading, error, searchCourses, retry }`.
  - `catalog`: flat array of
    `{ id, title, code, departmentId, departmentName, collegeId, collegeName, hours }`.
    `code` is set to `course.id`.
  - `searchCourses(query)`: case-insensitive substring match on `title` or
    `id`. Returns `[]` for a blank query.
  - `retry()`: increments `retryTrigger` to re-run the full load.
- `useScrapeStatus()` [useScrapeStatus.js:useScrapeStatus]: returns
  `{ lastUpdate, status, loading, error }`. `lastUpdate` is a `Date` or `null`.
  `status` defaults to `'idle'`.
- `parseUtcDate(dateStr)` [useScrapeStatus.js:parseUtcDate]: returns `null` for
  falsy input and passes a `Date` through. For a string with no `Z` or
  `+HH:MM`/`-HH:MM` suffix, it appends `Z` so the value is read as UTC.
- Depends on `../api/scheduleApi` (`fetchColleges`, `fetchDepartments`,
  `fetchCourses`, `fetchScrapeStatus`). See [api](../api/EGM.md).

## Invariants

- Catalog load order is colleges, then all departments in parallel
  (`Promise.all`), then all courses in parallel. Any single failure fails the
  whole load and sets `error` [useCourseCatalog.js:loadCatalog].
- A `cancelled` flag set in the effect cleanup stops state updates after
  unmount or re-run [useCourseCatalog.js:useCourseCatalog,
  useScrapeStatus.js:useScrapeStatus].
- `colleges` is set as soon as the colleges request succeeds, before
  departments and courses finish [useCourseCatalog.js:loadCatalog].
- Scrape status cache key is `'kfu-scrape-status'` and TTL is 5 minutes
  (`CACHE_TTL = 5 * 60 * 1000`). A fresh cache entry skips the network request
  entirely [useScrapeStatus.js:CACHE_KEY, CACHE_TTL, getCachedStatus].
- Corrupt cache JSON is ignored and treated as a miss
  [useScrapeStatus.js:getCachedStatus].
- `useCourseCatalog` is listed in ESLint's
  `react-refresh/only-export-components` `allowExportNames`
  (`frontend/eslint.config.js`). `useScrapeStatus` and `parseUtcDate` are not.

## Side Effects

- Network: `useCourseCatalog` issues 1 + N(colleges) + N(departments) GET
  requests per load [useCourseCatalog.js:loadCatalog]. `useScrapeStatus`
  issues one GET on a cache miss [useScrapeStatus.js:loadStatus].
- Storage: reads and writes `sessionStorage['kfu-scrape-status']` as
  `{ data, timestamp }` [useScrapeStatus.js:getCachedStatus, loadStatus].
- Logging: `console.error('Failed to load catalog:', err)` on catalog failure
  [useCourseCatalog.js:loadCatalog].

## Verification

- Run from `frontend/`: `npm run lint`
- Run from `frontend/` (Windows CMD/PowerShell, not WSL): `npm run build`
