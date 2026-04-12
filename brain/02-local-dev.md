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
