# Local development

## Environment files (not committed)

| Location | Purpose |
| --- | --- |
| `backend/.env` | `DATABASE_URL`, Hugging Face models/tokens, JWT `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` |
| `frontend/.env` | `VITE_API_BASE_URL`, `VITE_WS_URL` (default: `http://localhost:8000` and `ws://localhost:8000`) |

Copy from `frontend/.env.example` if you need a template; backend follows `backend/README.md`.

## Run commands

**Backend** (from `backend/`, with venv activated):

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (pnpm):

```bash
cd frontend && pnpm install && pnpm dev
```

PostgreSQL must match `DATABASE_URL` (host, port, database name, credentials). Tables are created on API startup.

## PostgreSQL via Docker (optional)

If Docker Desktop is running, from the repo root:

```bash
docker compose up -d
```

This starts `postgres:16-alpine` on port **5433** with user `postgres`, password `root`, database `accessai` — aligned with the sample `DATABASE_URL` in `backend/README.md` and typical local `.env` files. Stop with `docker compose down`.
