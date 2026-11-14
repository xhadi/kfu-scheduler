# frontend/src

## Overview

Source root of the React 19 + Vite single-page app. `main.jsx` mounts `App`.
`App` nests the three context providers and switches between the two screens
by `ScheduleContext.step`. There is no router. `uiText.js` holds every Arabic
UI string.

## Interface

- `main.jsx` [main.jsx]: `createRoot(document.getElementById('root'))` renders
  `<App />` inside `StrictMode` and imports `./index.css`.
- `App` (default export) [App.jsx:App]: provider order is
  `ThemeProvider` → `UiTextProvider` → `ScheduleProvider`. Layout is
  `Header`, `<main>` with `AppContent`, then `Footer`.
- `AppContent` (module-private) [App.jsx:AppContent]: renders
  `CourseSelectionPage` when `step === 1`, otherwise `ResultsPage`.
- `uiText` [uiText.js:uiText]: flat object of Arabic UI strings keyed by
  English identifiers (for example `appTitle`, `generate`, `sun`…`thu`,
  `scheduleCount`, `estimatedTime`). Consumed only through `useUiText().text`.
- Subdirectories:
  - [api](./api/EGM.md): `fetch` client for the backend
    (`fetchColleges`, `fetchDepartments`, `fetchCourses`,
    `generateSchedules`, `fetchScrapeStatus`).
  - [contexts](./contexts/EGM.md): `ThemeProvider`/`useTheme`,
    `UiTextProvider`/`useUiText`, `ScheduleProvider`/`useSchedule`.
  - [hooks](./hooks/EGM.md): `useCourseCatalog`, `useScrapeStatus`,
    `parseUtcDate`.
  - [components](./components/EGM.md): `Header`, `Footer`, and the
    `Step1/` and `Step2/` screens.
  - `assets/`: images only (`github.png`, `telegram.png`). No contract.

## Invariants

- `Header`, `Footer`, and both step screens must render inside all three
  providers. Each context is created with `createContext()` and no default,
  so `useTheme`, `useUiText`, and `useSchedule` return `undefined` outside
  their provider [App.jsx:App, contexts/ThemeContext.jsx:ThemeContext,
  contexts/UiTextContext.jsx:UiTextContext,
  contexts/ScheduleContext.jsx:ScheduleContext].
- Navigation is state-driven: `step === 1` shows course selection, any other
  value shows results [App.jsx:AppContent].
- `uiText` placeholders use `{name}` syntax: `scheduleCount` takes `{found}`
  and `estimatedTime` takes `{seconds}` [uiText.js:uiText].
- UI text is Arabic-only and the direction is always RTL
  (see [contexts](./contexts/EGM.md)).

## Side Effects

- DOM: mounts the React tree into `#root` [main.jsx].
- All network, storage, and timer effects live in the subdirectories. See
  the child contracts above.

## Verification

- Run from `frontend/`: `npm run lint`
- Run from `frontend/` (Windows CMD/PowerShell, not WSL): `npm run build`
