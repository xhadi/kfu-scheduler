# KFU Scheduler Frontend

React 19 + Vite 8 + Tailwind CSS v4 frontend for the KFU Schedule Maker. Provides an Arabic-only RTL interface for selecting courses and generating conflict-free schedule combinations. Deploys to Firebase Hosting.

## Quick Start

**Prerequisites:** Node.js 18+, npm

```bash
# Install dependencies
npm install

# Start development server (port 5173, proxies /api to localhost:8000)
npm run dev

# Build for production (must run from Windows CMD/PowerShell, not WSL)
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Architecture

### Two-Step Flow

The app uses a two-step flow with no router. Navigation is controlled by `ScheduleContext.step`:

**Step 1 — Course Selection:**
- Gender selector (male/female)
- Course search with type-ahead (max 10 results)
- Selected courses list with remove buttons
- Loading state with progress bar (handles Render cold-start ~50s)
- Generate button

**Step 2 — Schedule Results:**
- Paginated results (50 per page, windowed page numbers)
- Collapsible filter panel (day-off, instructor, CRN, availability)
- Weekly timetable grid (Sun-Thu, dynamic hour range)
- Section blocks with course colors and status icons

### Component Structure

```
src/
├── main.jsx                 # React entry (StrictMode + createRoot)
├── App.jsx                  # Root component (providers + Header/Footer + step routing)
├── index.css                # Tailwind v4 config, custom theme, dark mode, fonts
├── uiText.js                # Arabic UI string constants
├── api/
│   └── scheduleApi.js       # API client functions
├── hooks/
│   ├── useCourseCatalog.js  # Loads college→dept→course tree on mount
│   └── useScrapeStatus.js   # Fetches last scrape time (5-min cache)
├── contexts/
│   ├── ThemeContext.jsx      # Light/dark theme (localStorage)
│   ├── UiTextContext.jsx     # Arabic text provider (always RTL)
│   └── ScheduleContext.jsx   # Main state management
└── components/
    ├── Header.jsx           # App title + dark mode toggle
    ├── Footer.jsx           # Last updated + GitHub/Telegram links
    ├── Step1/               # Course selection components
    │   ├── CourseSelectionPage.jsx
    │   ├── GenderSelector.jsx
    │   ├── CourseSearch.jsx
    │   ├── WantedList.jsx
    │   ├── CatalogLoader.jsx
    │   └── LoadingModal.jsx
    └── Step2/               # Results components
        ├── ResultsPage.jsx
        ├── FilterBar.jsx
        ├── ScheduleCard.jsx
        ├── WeekGrid.jsx
        ├── TimetableBlock.jsx
        └── schedule.css
```

## State Management

Three React Contexts (no external state library):

### ThemeContext

```jsx
const { theme, setTheme } = useTheme()
// theme: 'light' | 'dark'
// setTheme: toggles and persists to localStorage('kfu-theme')
```

Class-based dark mode via `.dark` class on `<html>`. No system option — only light/dark toggle. Flash-prevention: inline script in `index.html` reads localStorage before React mounts.

### UiTextContext

```jsx
const { text } = useUiText()
text('appTitle')           // → 'جدولني - KFU'
text('scheduleOf', { current: 1, total: 5 })  // → 'الجدول 1 من 5'
```

All UI strings are in `src/uiText.js`. Always RTL.

### ScheduleContext

```jsx
const {
  gender, selectedCourses, results, loading, error,
  step, currentScheduleIndex, filters, filteredOptions,
  courseColorMap, addCourse, removeCourse, handleGenerate, goBack
} = useSchedule()
```

Key state:
- `gender`: `'male'` | `'female'` | `null`
- `selectedCourses`: array of course objects
- `results`: API response from `generateSchedules()`
- `step`: `1` (selection) | `2` (results)
- `filters`: `{ daysOff: Set, instructors: Set, crns: Set, availability: 'all' | 'available_only' }`
- `filteredOptions`: memoized filtered schedule list
- `courseColorMap`: maps `course_id` to color index (0-7)

### Custom Hooks

**`useCourseCatalog()`:**
- Loads full college→dept→course tree on mount (parallel fetches)
- Provides `searchCourses(query)` and `retry()`
- Handles loading and error states

**`useScrapeStatus()`:**
- Fetches last scrape timestamp from `/api/scraping/last-update`
- 5-minute sessionStorage cache
- Returns `{ lastUpdate, status, loading, error }`

## Styling

### Tailwind CSS v4

Configured via `@tailwindcss/vite` plugin (no PostCSS config file needed).

**Custom theme (`index.css`):**
```css
@theme {
  --color-primary: #0d9488;        /* Teal */
  --color-primary-light: #14b8a6;
  --color-primary-dark: #0f766e;
  --color-surface: #ffffff;
  --color-surface-dark: #0b1329;   /* Deep navy */
  --color-text: #111827;
  --color-text-dark: #f3f4f6;
  --color-text-secondary: #6b7280;
  --color-text-dark-secondary: #9ca3af;
  --color-border: #e5e7eb;
  --color-border-dark: #1e293b;
  --color-cta: #f97316;            /* Orange accent */
}
```

### Dark Mode

Class-based (`dark:` prefix), toggled via `document.documentElement.classList.toggle('dark', ...)`.

### RTL

Always RTL (`dir="rtl"` on `<html>`). Uses Tailwind's logical properties (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`).

**Fonts:**
- Arabic (RTL): Cairo
- LTR: Plus Jakarta Sans

### Course Colors

8 distinct colors cycle through courses, with separate light/dark mode palettes in `schedule.css`. Colors are assigned via `courseColorMap` in `ScheduleContext`.

## API Integration

**Production:** `https://kfu-schedular-api.onrender.com/api` (hardcoded in `scheduleApi.js`)

**Development:** Vite proxies `/api` to `http://localhost:8000`

**Functions:**
- `fetchColleges()` — GET `/api/colleges`
- `fetchDepartments(collegeId)` — GET `/api/colleges/{id}/departments`
- `fetchCourses(deptId)` — GET `/api/departments/{id}/courses`
- `generateSchedules(courseIds, gender)` — POST `/api/schedules/generate`
- `fetchScrapeStatus()` — GET `/api/scraping/last-update`

## Key Features

### Server Cold-Start Handling

The `CatalogLoader` component shows a progress bar with estimated time when the Render backend is waking from idle (~50 seconds). It displays a message explaining the delay and counts down the estimated time.

### Pagination

Results are paginated at 50 per page with windowed page numbers (5 visible at a time). Navigation includes first/last buttons and previous/next.

### Filters

The `FilterBar` provides:
- **Day-off:** Checkboxes for each day (Sun-Thu). Maps English keys to Arabic abbreviations via `KEY_TO_ABBREV`.
- **Instructor:** Search + checkbox list of available instructors
- **CRN:** Search + checkbox list of available CRNs
- **Availability:** Radio buttons (all / available only)

Filters are applied client-side via `ScheduleContext.filteredOptions`.

### Timetable Grid

`WeekGrid` renders a CSS-position-based weekly grid:
- 5-day week (Sun-Thu, no Saturday)
- Dynamic hour range based on actual section times
- 60px per hour
- Section blocks with course colors, status icons, and clamped text

## Dependencies

**Runtime:**
- `react` 19.2.6
- `react-dom` 19.2.6
- `@tailwindcss/vite` 4.3.0
- `lucide-react` 1.17.0
- `dotenv` 17.4.2

**Dev:**
- `vite` 8.0.12
- `@vitejs/plugin-react` 6.0.1
- `tailwindcss` 4.3.0
- `eslint` 10.3.0
- `eslint-plugin-react-hooks` 7.1.1
- `eslint-plugin-react-refresh` 0.5.2

## Deployment

### Firebase Hosting

- Project: `kfu-scheduler` (configured in `.firebaserc`)
- `firebase.json`: serves from `dist/`, SPA rewrite (`**` → `/index.html`)

### GitHub Actions

- **On merge to `main`:** Builds and deploys to Firebase Hosting live channel
- **On PR:** Builds and creates preview channel
- Uses `FIREBASE_SERVICE_ACCOUNT_KFU_SCHEDULER` secret

### Build Command

```bash
npm run build
```
