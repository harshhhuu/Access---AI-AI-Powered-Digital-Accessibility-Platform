# AccessAI Node API (migration)

**Fastify** + **Prisma** + **TypeScript**. Phase 2 added `GET /health` and DB; **Phase 3** added **`/auth/*`** (register, login, me, preferences) compatible with `backend/auth.py` and `backend/routers/auth.py` (JWT HS256, bcrypt, same JSON shapes).

## Prerequisites

- Node 20+
- [pnpm](https://pnpm.io/) 9+
- PostgreSQL (local Docker: `docker compose up -d` from repo root → port **5433**)

## Setup

```bash
cd server
pnpm install
cp .env.example .env
# Edit .env — DATABASE_URL, SECRET_KEY (must match backend/.env during migration for token parity), FRONTEND_URL
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
- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/preferences` (Bearer token)

Use `PORT=8001` in `.env` if the Python backend still uses 8000.

## Environment

| Variable | Role |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret (same as `backend` for interchangeable tokens) |
| `ALGORITHM` | Default `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default `1440` |
| `FRONTEND_URL` | CORS allowlist |
| `PORT` / `HOST` | Listen address (default `8000` / `0.0.0.0`) |

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Dev server with reload (`tsx watch`) |
| `pnpm build` | Compile to `dist/` |
| `pnpm start` | Run compiled app |
| `pnpm run db:migrate:dev` | Create/apply migrations (development) |
| `pnpm run db:migrate` | Apply migrations (production / CI) |
