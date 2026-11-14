# components

## Overview

All UI components. `Header` and `Footer` frame every page. `Step1/` and
`Step2/` hold the two screens of the course-selection → results flow.

## Why

- `Footer` shows the last scrape time so users can judge how fresh the course data is.

## Interface

- `Header` (default export) [Header.jsx:Header]: app title link to `/` and a
  light/dark toggle button that calls `setTheme`.
- `Footer` (default export) [Footer.jsx:Footer]: "last updated" relative time
  from `useScrapeStatus().lastUpdate`, a developer credit, and external links
  to GitHub (`https://github.com/xhadi/kfu-schedular`) and Telegram
  (`https://t.me/JadwilniBot`).
- `formatRelativeTime(date)` (module-private) [Footer.jsx:formatRelativeTime]:
  Arabic relative time (`الآن`, `منذ N دقيقة/ساعة/يوم`) with singular, dual,
  and plural forms.
- Subdirectories:
  - [Step1](./Step1/EGM.md): gender selection, course search, wanted list,
    generation trigger, loading and no-schedule modals.
  - [Step2](./Step2/EGM.md): filter bar, paginated results, weekly timetable
    grid, and section blocks.
- Depends on [contexts](../contexts/EGM.md) (`useTheme`, `useUiText`) and
  [hooks](../hooks/EGM.md) (`useScrapeStatus`).

## Invariants

- The theme toggle switches only between `'light'` and `'dark'`
  [Header.jsx:Header].
- `Footer` shows `'...'` while loading, then the relative time, then
  `footerUnknown` when `lastUpdate` is `null` [Footer.jsx:Footer].
- Relative time below 1 minute is `الآن`. Values of 1 and 2 use the singular
  and dual Arabic forms. Everything else uses the plural form
  [Footer.jsx:formatRelativeTime].

## Side Effects

- Network and storage (indirect): `Footer` calls `useScrapeStatus`, which may
  GET `/scraping/last-update` and writes `sessionStorage`
  [Footer.jsx:Footer].
- Storage and DOM (indirect): `Header` calls `setTheme`, which writes
  `localStorage['kfu-theme']` and toggles the `dark` class on `<html>`
  [Header.jsx:Header].
- Timers: `Footer` refreshes the relative time with a 60-second
  `setInterval`, cleared on unmount or when `lastUpdate` changes
  [Footer.jsx:Footer].
- Assets: `Footer` imports `../assets/github.png` and
  `../assets/telegram.png` [Footer.jsx].

## Verification

- Run from `frontend/`: `npm run lint`
- Run from `frontend/` (Windows CMD/PowerShell, not WSL): `npm run build`
