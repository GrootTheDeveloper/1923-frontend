# CVMatch AI Frontend

React/Vite dashboard for the CV-JD matching MVP.

## Local Run

Start the backend first:

```bash
cd ../1923-backend
python -m uvicorn app.main:app --reload --port 8000
```

Start the frontend:

```bash
cd ../1923-frontend
npm install
npm run dev
```

Use this API base when running locally:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Demo Flow

1. Paste a JD and create it.
2. Upload one or more selectable-text PDF CVs.
3. Review extracted CV data and save corrections.
4. Run matching for the selected JD.
5. Open ranking details, inspect evidence, update status, and export CSV.

## Checks

```bash
npm run lint
npm run build
```
