# AccessAI Node API (migration Phase 2)

Minimal **Fastify** + **Prisma** shell: `GET /health`, PostgreSQL connection, CORS aligned with `backend/main.py`. Feature routes (auth, simplify, …) come in later phases.

## Prerequisites

- Node 20+
- [pnpm](https://pnpm.io/) 9+
- PostgreSQL (local Docker: `docker compose up -d` from repo root → port **5433**)

## Setup

```bash
cd server
pnpm install
cp .env.example .env
# Edit .env — set DATABASE_URL if different from the example
pnpm exec prisma generate
pnpm run db:migrate:dev
```

**Migrations**

- **Empty database:** `pnpm run db:migrate:dev` (or `pnpm exec prisma migrate deploy`) creates `users`, `api_cache`, and `sign_logs` to match `backend/models.py`.
- **Database already created by the Python backend:** tables may already exist. In that case, after `pnpm exec prisma generate`, mark the initial migration as applied without re-running SQL:
  `pnpm exec prisma migrate resolve --applied 20260412120000_init`
  (only once per environment; then `pnpm exec prisma migrate status` should show up to date).

## Run

```bash
pnpm dev
```

- Health: `GET http://localhost:8000/health` → `{"status":"ok","message":"AccessAI API is running"}`

To try alongside the Python backend, set `PORT=8001` in `.env` and point the frontend at `http://localhost:8001` only for `/health` tests.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Dev server with reload (`tsx watch`) |
| `pnpm build` | Compile to `dist/` |
| `pnpm start` | Run compiled app |
| `pnpm run db:migrate:dev` | Create/apply migrations (development) |
| `pnpm run db:migrate` | Apply migrations (production / CI) |
