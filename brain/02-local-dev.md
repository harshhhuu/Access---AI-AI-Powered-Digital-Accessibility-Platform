# Local development

## Environment files (tracked in repo)

| Location | Purpose |
| --- | --- |
| `backend/.env` | `DATABASE_URL`, Hugging Face models/tokens, JWT `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` |
| `frontend/.env` | `VITE_API_BASE_URL`, `VITE_WS_URL` |
| `server/.env` | `DATABASE_URL`, JWT, `FRONTEND_URL`, `HF_*`, optional `PORT` / `HOST` — align JWT with `backend/.env` when testing both APIs |

Use local-only overrides in `.env.local` (gitignored). Backend details: `backend/README.md`.

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

## Node API (Phase 2 migration)

The Fastify + Prisma app in `server/` is the future main API. It exposes `GET /health`, **`/auth/*`** (register, login, me, preferences), and connects to the same PostgreSQL schema as the Python backend.

```bash
cd server
pnpm install
pnpm exec prisma generate
# Empty DB: pnpm run db:migrate:dev
# DB already used by Python: see `server/README.md` (baseline `migrate resolve`)
pnpm dev
```

Use `PORT=8001` in `server/.env` if you still run the Python app on 8000. Point the frontend at `http://localhost:8001` only to test `/health` until feature routes are ported.

## Sign inference service (Phase 1 migration)

The standalone Python service for TensorFlow sign prediction lives in `services/sign-inference/`. It listens on **9001** by default and is separate from the main FastAPI app on 8000.

```bash
cd services/sign-inference
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Optional: place sign_model.h5 in models/, or set MODEL_PATH
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 9001
```

- `GET http://127.0.0.1:9001/health` — `model_loaded` is false until `models/sign_model.h5` exists (or `MODEL_PATH` points to a file).
- For a **local smoke test** without the real model, you can generate a tiny placeholder (not for production): `python temp/generate_dummy_sign_model.py` (writes `services/sign-inference/models/sign_model.h5`, gitignored).

## PostgreSQL via Docker (optional)

If Docker Desktop is running, from the repo root:

```bash
docker compose up -d
```

This starts `postgres:16-alpine` on port **5433** with user `postgres`, password `root`, database `accessai` — aligned with the sample `DATABASE_URL` in `backend/README.md` and typical local `.env` files. Stop with `docker compose down`.
