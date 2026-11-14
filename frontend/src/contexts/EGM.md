# contexts

## Overview

React context providers for app-wide state. `ThemeContext` holds the
light/dark theme. `UiTextContext` provides Arabic UI strings and the fixed RTL
direction. `ScheduleContext` holds the two-step workflow state: gender,
selected courses, generated results, filters, and step navigation.

## Why

- `handleGenerate` stays on step 1 and opens the no-schedule modal when the result is empty. Before this, users landed on an empty step 2 with no easy way back; staying on step 1 keeps their course selection intact.

## Interface

- `ThemeProvider` / `useTheme()` [ThemeContext.jsx:ThemeProvider, useTheme]:
  value `{ theme, setTheme }`. `theme` is `'light'` or `'dark'`.
- `UiTextProvider` / `useUiText()` [UiTextContext.jsx:UiTextProvider, useUiText]:
  value `{ dir, text }`.
  - `dir` is always `'rtl'`.
  - `text(key, params?)` returns `uiText[key]`, or the key itself when missing.
    It replaces each `{name}` placeholder with `params[name]`.
- `ScheduleProvider` / `useSchedule()` [ScheduleContext.jsx:ScheduleProvider, useSchedule]:
  value contains:
  - `gender`, `setGender`
  - `selectedCourses`, `addCourse(course)`, `removeCourse(courseId)`
  - `results`, `loading`, `error`
  - `currentScheduleIndex`, `setCurrentScheduleIndex`
  - `step`, `setStep`
  - `handleGenerate(courseIds)`, `goBack()`
  - `filters`, `setFilters`, `filteredOptions`
  - `courseColorMap`
  - `showNoScheduleModal`, `closeNoScheduleModal()`
- Depends on `../api/scheduleApi` (`generateSchedules`), see
  [api](../api/EGM.md), and on `../uiText` (`uiText`), see
  [src](../EGM.md).

## Invariants

- `step` is `1` (course selection) or `2` (results). `handleGenerate` moves to
  step 2 only when `data.options` is non-empty. An empty result opens the
  no-schedule modal and stays on step 1 [ScheduleContext.jsx:handleGenerate].
- `handleGenerate` sends the current `gender` from context, not a parameter
  [ScheduleContext.jsx:handleGenerate].
- `addCourse` ignores a course whose `id` is already selected
  [ScheduleContext.jsx:addCourse].
- `filters` shape is
  `{ daysOff: Set, instructors: Set, crns: Set, availability: 'all' | 'available_only' }`.
  `goBack` resets it to empty sets and `'all'`, clears `results` and `error`,
  and returns to step 1 [ScheduleContext.jsx:filters, goBack].
- `filteredOptions` keeps a schedule only when all of these hold
  [ScheduleContext.jsx:filteredOptions]:
  - `availability === 'available_only'` requires every section `status` to be
    `'متاحة'`.
  - No used `time_slots[].day` matches a day-off key, mapped through
    `KEY_TO_ABBREV` (`sun→ح`, `mon→ن`, `tue→ث`, `wed→ر`, `thu→خ`).
  - Every selected instructor appears as some section's `teacher`.
  - Every selected CRN appears as `String(section.crn)`.
- `courseColorMap` assigns indexes `0, 1, 2, …` to `course_id` values in
  first-seen order across all `results.options`
  [ScheduleContext.jsx:courseColorMap].
- Theme defaults to `'light'` when `localStorage['kfu-theme']` is unset. There
  is no system option [ThemeContext.jsx:ThemeProvider].
- `useTheme`, `useUiText`, and `useSchedule` are listed in ESLint's
  `react-refresh/only-export-components` `allowExportNames`
  (`frontend/eslint.config.js`).

## Side Effects

- Storage: `ThemeProvider` reads and writes `localStorage['kfu-theme']`
  [ThemeContext.jsx:ThemeProvider].
- DOM: `ThemeProvider` toggles the `dark` class on `document.documentElement`
  [ThemeContext.jsx:ThemeProvider].
- Network: `handleGenerate` calls `generateSchedules` (POST
  `/schedules/generate`) [ScheduleContext.jsx:handleGenerate].

## Verification

- Run from `frontend/`: `npm run lint`
- Run from `frontend/` (Windows CMD/PowerShell, not WSL): `npm run build`
