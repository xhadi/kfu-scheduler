# components/Step2

## Overview

Step 2 of the two-step flow: show generated schedules. `ResultsPage` is the
entry component. It renders `FilterBar` for client-side filters, then a
paginated vertical list of `ScheduleCard` timetables. Each card holds a
Sunday-to-Thursday `WeekGrid` of `TimetableBlock` section blocks.

## Interface

- `ResultsPage` (default export) [ResultsPage.jsx:ResultsPage]: reads
  `results`, `filteredOptions`, `goBack`, `courseColorMap` from
  `useSchedule()`. Shows the result count, a large-result warning, a status
  legend, the "edit courses" button (`goBack`), and pagination controls above
  and below the list.
- `FilterBar` [FilterBar.jsx:FilterBar]: collapsible panel that edits
  `filters` via `setFilters`. Controls: day-off checkboxes, availability radio
  (`'all'` / `'available_only'`), searchable instructor and CRN checklists, and
  a clear button.
- `ScheduleCard({ scheduleId, schedule, courseColorMap })`
  [ScheduleCard.jsx:ScheduleCard]: header with `#scheduleId` and CRN badges,
  day column headers, and a `WeekGrid`.
- `WeekGrid({ schedule, courseColorMap })` [WeekGrid.jsx:WeekGrid]: hour grid
  with absolutely positioned section blocks.
- `TimetableBlock({ section, colorIndex })` [TimetableBlock.jsx:TimetableBlock]:
  one section block showing `course_id`, a status icon, `course_title`,
  `section_type #section_number`, CRN, and `teacher`.
- Styles: `schedule.css` provides `course-bg-0` … `course-bg-7` and the
  `status-*` classes used by `TimetableBlock`.
- Depends on [contexts](../../contexts/EGM.md) (`useSchedule`, `useUiText`).

## Invariants

- Pagination: `PAGE_SIZE = 50`, `WINDOW = 5` page buttons. The current page is
  clamped to the valid range (`safePage`), and the window stays centered on it
  when possible [ResultsPage.jsx:PAGE_SIZE, WINDOW, safePage, windowStart].
- `ResultsPage` shows `noResults` when `results` is missing or
  `total_options_found === 0`, and `noFilters` (with `FilterBar`) when filters
  remove every option. The `largeResults` warning shows when
  `total_options_found > 100` [ResultsPage.jsx:ResultsPage].
- Day keys are `sun`…`thu` only. There is no Saturday
  [FilterBar.jsx:DAYS, WeekGrid.jsx:DAYS, ScheduleCard.jsx:ScheduleCard].
- `WeekGrid` buckets slots by Arabic day abbreviation (`ح`, `ن`, `ث`, `ر`,
  `خ`). Slots with any other `day` value are dropped [WeekGrid.jsx:DAYS,
  sectionsByDay].
- `WeekGrid` flattens each section into one item per `time_slots` entry
  (`day`, `start` → `start_time`, `end` → `end_time`). Times must be `HH:MM`
  [WeekGrid.jsx:allSlots, parseTime].
- Grid bounds are `floor(min start)` to `ceil(max end)` hours, with defaults
  7 and 20 when there are no slots. Each hour is `SLOT_H = 60` px. Block
  height is `max(duration * 60 - 2, 10)` px [WeekGrid.jsx:firstHour, lastHour,
  SLOT_H]. Hour labels use 12-hour AM/PM format [WeekGrid.jsx:to12Hour].
- Status mapping: `'متاحة'` → `status-available`, `'ممتلئة'` → `status-full`,
  `'غير متاحة'` → `status-not-available`, anything else → `status-unknown`
  [TimetableBlock.jsx:STATUS_CLASS, getStatusIcon].
- Course color is `course-bg-${colorIndex % 8}`, where `colorIndex` comes from
  `courseColorMap[sec.course_id]` (default 0) [TimetableBlock.jsx:bgClass,
  WeekGrid.jsx:WeekGrid].
- Instructor options are de-duplicated non-empty `teacher` values, sorted.
  CRN options are de-duplicated `String(sec.crn)`, sorted with
  `localeCompare`. Both are drawn from all `results.options`, not only the
  filtered ones [FilterBar.jsx:instructors, crns].
- The active filter count is
  `daysOff.size + instructors.size + crns.size + (availability !== 'all' ? 1 : 0)`.
  The clear button resets `filters` to the same empty value as `goBack`
  [FilterBar.jsx:activeCount, clearFilters].

## Side Effects

- None outside React state. `FilterBar` updates the shared `filters` in
  `ScheduleContext` [FilterBar.jsx:toggleDay, toggleInstructor, toggleCrn,
  clearFilters]. "Edit courses" calls `goBack`, which clears results and
  returns to step 1 [ResultsPage.jsx:ResultsPage].
- `ScheduleCard`, `WeekGrid`, and `TimetableBlock` import `./schedule.css`
  (global stylesheet injection by Vite) [ScheduleCard.jsx, WeekGrid.jsx,
  TimetableBlock.jsx].

## Verification

- Run from `frontend/`: `npm run lint`
- Run from `frontend/` (Windows CMD/PowerShell, not WSL): `npm run build`
