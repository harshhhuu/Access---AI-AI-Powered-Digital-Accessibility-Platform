# AccessAI Node API (migration)

**Fastify** + **Prisma** + **TypeScript** — **primary HTTP API** for AccessAI. **`GET /health`**, **`/auth/*`**, **`POST /api/simplify`**, **`POST /api/describe`** / **`/api/describe/url`** (multipart + URL; sharp fallback when HF returns 502), **`POST /api/voice`** (Whisper via HF Router, cached), **`POST /api/sign/predict`** and **`WebSocket /ws/sign`** (proxy to **`services/sign-inference`** via `SIGN_SERVICE_URL`; HTTP may write **`sign_logs`**).

## Prerequisites

- Node 20+
- [pnpm](https://pnpm.io/) 9+
- PostgreSQL (local Docker: `docker compose up -d` from repo root → port **5433**)

## Setup

```bash
cd server
pnpm install
# Copy `server/.env.example` to `server/.env` and fill in secrets
pnpm exec prisma generate
pnpm run db:migrate:dev
```

**Migrations**

- **Empty database:** `pnpm run db:migrate:dev` (or `pnpm exec prisma migrate deploy`) creates `users`, `api_cache`, and `sign_logs`.
- **Database already exists** (e.g. from an older stack): tables may already exist. After `pnpm exec prisma generate`, mark the initial migration as applied without re-running SQL:
  `pnpm exec prisma migrate resolve --applied 20260412120000_init`
  (only once per environment; then `pnpm exec prisma migrate status` should show up to date).

## Run

```bash
pnpm dev
```

- Health: `GET http://localhost:<PORT>/health` (default **8000** or **8001** from `PORT` in `.env`) → `{"status":"ok","message":"AccessAI API is running"}`
- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/preferences` (Bearer token)
- Simplify: `POST /api/simplify` — JSON `{ "text", "grade_level"? }`; needs `HF_API_TOKEN`, `HF_TEXT_MODEL`
- Describe: `POST /api/describe` — multipart field **`image`** (JPEG/PNG/WebP/GIF, ≤ 5 MB); `POST /api/describe/url` — JSON `{ "url" }`; needs `HF_VISION_MODEL` (and `HF_API_TOKEN`)
- Voice: `POST /api/voice` — multipart field **`audio`** (≤ 25 MB); needs `HF_API_TOKEN` (Whisper on HF Router)
- Sign (HTTP): `POST /api/sign/predict` — JSON `{ "landmarks": number[] }` (exactly **63** floats); needs **`SIGN_SERVICE_URL`** pointing at sign-inference (`POST /predict`). On success, inserts a **`sign_logs`** row.
- Sign (WebSocket): connect to **`ws://<host>:<port>/ws/sign`**. Send JSON `{ "landmarks": [ ... 63 floats ] }`; receive `{ "sign", "confidence" }` or `{ "error": "..." }`. Does not write to the DB per frame.

Default **`PORT=8001`** in `.env`. For sign, run **sign-inference** on **9001** (see `services/sign-inference/README.md`), set **`SIGN_SERVICE_URL`**, and point the frontend at **`ws://localhost:8001`** (`VITE_WS_URL`).

### Observability

- **Request tracing:** `genReqId` (from `x-request-id` header or UUID). Response includes **`x-request-id`** echoing the request id.
- **Upstream latency:** JSON logs with `upstream` (`hf_simplify` \| `hf_describe` \| `hf_whisper` \| `sign_inference`) and `upstreamMs` after each Hugging Face or sign-inference call.

### Optional load testing

See **`load/README.md`** — k6 smoke script for `POST /api/simplify` (install k6 separately).

### Docker (Compose profile `fullstack`)

From the **repo root** — builds **sign-inference** (internal port 9001, not published) + this API on **8001**:

```bash
docker compose --profile fullstack up -d --build
```

Requires **`server/.env`** for `HF_*`, `SECRET_KEY`, etc. Compose overrides **`DATABASE_URL`** and **`SIGN_SERVICE_URL`** for in-network service names (`db`, `sign`). Image: **`Dockerfile`** in this folder; entrypoint runs **`prisma migrate deploy`** then **`node dist/index.js`**. See **`../deploy/README.md`**.

## Environment

| Variable | Role |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `ALGORITHM` | Default `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default `1440` |
| `FRONTEND_URL` | CORS allowlist |
| `HF_API_TOKEN` | Hugging Face Router token (required for `/api/simplify`, `/api/describe`, `/api/voice`) |
| `SIGN_SERVICE_URL` | Base URL of the Python sign-inference service (no trailing slash), e.g. `http://127.0.0.1:9001` — required for `/api/sign/predict` and `/ws/sign` |
| `HF_TEXT_MODEL` | Defaults to `Qwen/Qwen2.5-72B-Instruct:novita` |
| `HF_VISION_MODEL` | Defaults to `CohereLabs/aya-vision-32b:cohere` (describe routes) |
| `PORT` / `HOST` | Listen address (default `8000` / `0.0.0.0`) |

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Dev server with reload (`tsx watch`) |
| `pnpm build` | Compile to `dist/` |
| `pnpm test` | Vitest — contract + sign client/golden tests (no DB required) |
| `pnpm start` | Run compiled app |
| `pnpm run db:migrate:dev` | Create/apply migrations (development) |
| `pnpm run db:migrate` | Apply migrations (production / CI) |
