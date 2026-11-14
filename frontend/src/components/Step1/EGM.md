# components/Step1

## Overview

Step 1 of the two-step flow: choose gender, search the catalog, build the
wanted-course list, and trigger schedule generation. `CourseSelectionPage` is
the entry component. The other files are its children.

## Interface

- `CourseSelectionPage` (default export) [CourseSelectionPage.jsx:CourseSelectionPage]:
  page shell. Uses `useSchedule()` and `useCourseCatalog()`. Shows
  `CatalogLoader` while the catalog loads, a `networkError` box with a
  `retry` button on catalog failure, and `CourseSearch` otherwise. Also renders
  the generate button and a collapsible "supported colleges" list.
- `CourseSearch({ searchCourses })` [CourseSearch.jsx:CourseSearch]: combobox
  input with a dropdown of up to 10 matches. Click or Enter adds a course via
  `addCourse`.
- `GenderSelector` [GenderSelector.jsx:GenderSelector]: radio group for
  `'male'` / `'female'` that calls `setGender`.
- `WantedList` [WantedList.jsx:WantedList]: chips for `selectedCourses`, each
  with a remove button that calls `removeCourse(course.id)`.
- `CatalogLoader` [CatalogLoader.jsx:CatalogLoader]: spinner for the first 3
  seconds, then a "server waking up" card with a progress bar.
- `LoadingModal` [LoadingModal.jsx:LoadingModal]: full-screen overlay shown
  while schedules generate.
- `NoScheduleModal` [NoScheduleModal.jsx:NoScheduleModal]: dialog shown when
  generation returns no options. Closes via `closeNoScheduleModal`.
- Depends on [contexts](../../contexts/EGM.md) (`useSchedule`, `useUiText`)
  and [hooks](../../hooks/EGM.md) (`useCourseCatalog`).

## Invariants

- The generate button is disabled unless `gender` is set, at least one course
  is selected, and no generation is in flight. It passes
  `selectedCourses.map(c => c.id)` to `handleGenerate`
  [CourseSelectionPage.jsx:canGenerate].
- `CourseSearch` input is disabled until a gender is chosen
  [CourseSearch.jsx:disabled].
- Search results are capped at 10 (`searchCourses(query).slice(0, 10)`), and
  Enter selects the first result [CourseSearch.jsx:results, handleKeyDown].
- After a selection the query clears, the dropdown closes, and the input
  regains focus [CourseSearch.jsx:handleSelect].
- `CatalogLoader` progress is
  `min(floor((secondsElapsed - 3) / 47 * 100), 99)`, and the remaining-time
  estimate is `max(50 - secondsElapsed, 1)` seconds. It never reaches 100%
  [CatalogLoader.jsx:progress, secondsRemaining].
- `WantedList` renders nothing when `selectedCourses` is empty
  [WantedList.jsx:WantedList].
- `NoScheduleModal` closes on Escape, backdrop click, or the OK button. Clicks
  inside the panel do not close it [NoScheduleModal.jsx:NoScheduleModal].
- Each `useCourseCatalog()` call starts its own load. `CourseSelectionPage`
  remounts when the user returns from step 2, so the catalog is fetched again
  [CourseSelectionPage.jsx:CourseSelectionPage].

## Side Effects

- Network (indirect): mounting `CourseSelectionPage` loads the full catalog
  via `useCourseCatalog`, and the generate button calls `handleGenerate`
  (POST `/schedules/generate`) [CourseSelectionPage.jsx:CourseSelectionPage].
- DOM listeners: `CourseSearch` adds a document `mousedown` listener to close
  the dropdown on outside clicks [CourseSearch.jsx:handleClickOutside].
  `NoScheduleModal` adds a window `keydown` listener for Escape
  [NoScheduleModal.jsx:handleKeyDown]. Both are removed on unmount.
- Timers: `CatalogLoader` runs a 1-second `setInterval`, cleared on unmount
  [CatalogLoader.jsx:CatalogLoader].

## Verification

- Run from `frontend/`: `npm run lint`
- Run from `frontend/` (Windows CMD/PowerShell, not WSL): `npm run build`
