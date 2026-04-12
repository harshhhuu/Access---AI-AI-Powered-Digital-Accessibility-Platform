# Local development

## Environment files (not committed)

Templates live in **`server/.env.example`** and **`frontend/.env.example`**. Copy them locally and fill in values:

```bash
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
```

| Location | Purpose |
| --- | --- |
| `frontend/.env` | `VITE_API_BASE_URL`, `VITE_WS_URL` (default Node API **8001**) |
| `server/.env` | `DATABASE_URL`, JWT, `FRONTEND_URL`, `HF_*`, **`SIGN_SERVICE_URL`** (Python sign-inference, e.g. `http://127.0.0.1:9001`), optional `PORT` / `HOST` |

Use local-only overrides in `.env.local` (gitignored). API details: `server/README.md`.

## Run everything (Node API + sign-inference + frontend + Postgres)

From the **repository root** (requires `services/sign-inference/.venv` — see sign-inference section below):

```bash
pnpm install
pnpm dev
```

This runs `scripts/dev-all.sh`: starts **Docker Postgres** (`docker compose up -d` when Docker is available), then **concurrently** — sign-inference on **9001**, Node API in `server/` (default **8001** from `server/.env`), Vite in `frontend/`. Use **Ctrl+C** to stop all processes; Postgres keeps running until `docker compose down`.

**Docker Compose API stack** (Node + sign-inference + Postgres in containers; Vite on the host): `pnpm dev:docker` — see `deploy/README.md`. Same as `bash scripts/dev-all.sh --docker`.

First-time **Prisma client** (if you have not built the server yet):

```bash
pnpm --dir server exec prisma generate
```

## Run commands

**Frontend** (pnpm):

```bash
cd frontend && pnpm install && pnpm dev
```

PostgreSQL must match `DATABASE_URL` in `server/.env` (host, port, database name, credentials). Schema is managed with **Prisma migrations** (`server/prisma/`).

## Node API

The Fastify + Prisma app in `server/` is the **main API**. It exposes `GET /health`, **`/auth/*`**, **`/api/*`**, and **`WebSocket /ws/sign`** (proxied to sign-inference).

```bash
cd server
pnpm install
pnpm exec prisma generate
# Empty DB: pnpm run db:migrate:dev
# DB from an older setup: see `server/README.md` (baseline `migrate resolve`)
pnpm dev
```

Point the frontend at **`http://localhost:8001`** and **`VITE_WS_URL=ws://localhost:8001`** (see `frontend/.env`).

## Sign inference service

The standalone Python service for TensorFlow sign prediction lives in `services/sign-inference/`. It listens on **9001** by default. The **browser never calls it directly**; the Node server forwards to **`SIGN_SERVICE_URL`**.

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

This starts `postgres:16-alpine` on port **5433** with user `postgres`, password `root`, database `accessai` — aligned with typical `DATABASE_URL` values in `server/.env`. Stop with `docker compose down`.
