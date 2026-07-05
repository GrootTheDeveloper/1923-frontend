# Lattice Recruitment Matching Workbench

React/Vite recruiter workbench for creating JDs, uploading CVs, running match jobs, reviewing evidence and fairness flags, recording decisions, and exporting a summary.

## Run

```powershell
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the backend `/api` URL. The backend must allow the browser origin through `FRONTEND_URLS` or a narrowly scoped `CORS_ALLOW_ORIGIN_REGEX`.

## Verify

```powershell
npm run lint
npm run build
```

The active application is `src/App.jsx`. Historical Project/Task pages and API clients are intentionally removed.
