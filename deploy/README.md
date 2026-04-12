# Deployment notes (Phase 9)

## Docker Compose (local / single-host)

- **DB only (default):** `docker compose up -d` — Postgres on **5433** (same as historical local dev).
- **Full stack:** `docker compose --profile fullstack up -d --build` — **db** + **sign-inference** (internal port 9001, not published) + **Node API** on **8001**.

The **api** service overrides `DATABASE_URL` and `SIGN_SERVICE_URL` for in-network hostnames (`db`, `sign`). Other variables (JWT, `HF_*`, etc.) come from `server/.env` — **do not commit production secrets**; use your platform’s secret store in real deployments.
If `server/.env` is missing locally, create it (see `brain/02-local-dev.md`) or Compose will fail to start the `api` service.

Convenience script (Compose API + Vite on host): `pnpm dev:docker` from the repo root.

## Rollback (high level)

1. Point **`VITE_API_BASE_URL`** / **`VITE_WS_URL`** (or DNS) back to a **previous Node API** deployment (image tag / git revision) if a release regresses.
2. The legacy **FastAPI monolith** was removed in Phase 10; rollback to it would require **restoring `backend/` from git history** (pre–Phase 10 commit), not a supported path for new work.
3. Keep **Postgres** data; schema is managed by Prisma migrations in `server/prisma/`.

## Blue/green or canary

Run the Node stack on a **separate hostname** or preview URL first; switch traffic when checks pass. No code change required beyond env and DNS.
