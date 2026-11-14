# frontend

## Overview

Build, lint, and hosting configuration for the KFU Schedule Maker web app
(`جدولني - KFU`): a React 19 single-page app built with Vite 8 and Tailwind v4,
served as an Arabic RTL page from Firebase Hosting. Application code lives in
`src/`. Human-facing setup notes are in [`Readme.md`](./Readme.md).

## Interface

### Subdirectories

- [`src/`](./src/EGM.md) - React app: entry point, contexts, hooks, API client,
  and Step 1 / Step 2 components.

### npm scripts (`package.json`)

- `[package.json:scripts.dev]` - `vite`
- `[package.json:scripts.build]` - `vite build`
- `[package.json:scripts.lint]` - `eslint .`
- `[package.json:scripts.preview]` - `vite preview`
- Runtime deps (`[package.json:dependencies]`): `react`, `react-dom`,
  `@tailwindcss/vite`, `lucide-react`, `dotenv`.

### Vite (`vite.config.js`)

- `[vite.config.js:plugins]` - `react()`, `tailwindcss()`.
- `[vite.config.js:server.proxy['/api']]` - target `http://localhost:8000`,
  `changeOrigin: true`.

### ESLint (`eslint.config.js`)

- `[eslint.config.js:globalIgnores]` - `['dist']`.
- `[eslint.config.js:files]` - `**/*.{js,jsx}` with `js.configs.recommended`,
  `reactHooks.configs.flat.recommended`, `reactRefresh.configs.vite`, browser
  globals, JSX enabled.
- `[eslint.config.js:rules['react-refresh/only-export-components']]` - `warn`,
  `allowExportNames: ['useTheme', 'useUiText', 'useSchedule', 'useCourseCatalog']`.

### Hosting (`firebase.json`)

- `[firebase.json:hosting.public]` - `dist`.
- `[firebase.json:hosting.rewrites]` - `**` → `/index.html`.

### HTML shell (`index.html`)

- `[index.html:<html>]` - `lang="ar" dir="rtl"`; mounts `/src/main.jsx` on
  `#root`.
- `[index.html:inline <script>]` - pre-React theme script reading
  `localStorage['kfu-theme']`.

### CI workflows (`../.github/workflows/`)

- `[firebase-hosting-merge.yml]` - on push to `main`: build and deploy to the
  live channel of Firebase project `kfu-scheduler`; sets `VITE_API_BASE_URL`
  from a secret.
- `[firebase-hosting-pull-request.yml]` - on same-repo pull requests: deploy a
  preview channel.

## Invariants

- **Dev proxy** (`[vite.config.js:server.proxy['/api']]`): in dev, `/api` goes
  to `http://localhost:8000`. No port is set, so Vite's default (5173) applies.
- **Allowed hook exports**
  (`[eslint.config.js:rules['react-refresh/only-export-components']]`):
  component files may export only `useTheme`, `useUiText`, `useSchedule`, and
  `useCourseCatalog` as non-components without a warning. A new exported hook
  must be added to this list.
- **Build output** (`[firebase.json:hosting.public]`): only `dist/` is hosted;
  `dist/` is never linted.
- **SPA routing** (`[firebase.json:hosting.rewrites]`): every path serves
  `/index.html`.
- **Theme key** (`[index.html:inline <script>]`): the key is `kfu-theme`. Only
  the exact value `dark` adds the `dark` class before React loads. Errors are
  swallowed.
- **Live deploy trigger** (`[firebase-hosting-merge.yml:on.push.branches]`):
  only pushes to `main`. The PR workflow does not set `VITE_API_BASE_URL`.
- **PR previews**
  (`[firebase-hosting-pull-request.yml:jobs.build_and_preview.if]`): skipped for
  forks.

## Side Effects

- `[index.html:inline <script>]` - reads `localStorage` and edits the
  `<html>` class list.
- `[index.html:<link href=fonts.googleapis.com>]` - loads Cairo and Plus
  Jakarta Sans from Google Fonts.
- `[vite.config.js:server.proxy['/api']]` - dev-time network calls to
  `localhost:8000`.
- `[firebase-hosting-merge.yml]`, `[firebase-hosting-pull-request.yml]` -
  deploy to Firebase Hosting (live or preview channel); the PR workflow may
  comment on the PR.

## Verification

- Run (from `frontend/`): `npm run lint`
- Run (from `frontend/`, Windows CMD/PowerShell only): `npm run build`
