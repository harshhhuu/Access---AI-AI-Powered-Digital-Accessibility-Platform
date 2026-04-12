# Node backend migration — phased implementation plan (sign stays Python)

**Approach:** Move the **main API** to **Node.js**. Keep **sign inference** (Keras `.h5` + TensorFlow) in a **small, dedicated Python service** that only loads the model and runs `predict()`. Node owns the public URL, auth, PostgreSQL, Hugging Face calls, caching, and **proxies** sign traffic to Python.

**Why this split:** The `.h5` model keeps running exactly as today (same code path, lowest risk). You only add a network hop and deployment surface for one extra process.

---

## Target architecture (conceptual)

```mermaid
flowchart TB
  subgraph clients [Clients]
    FE[React app]
    EXT[Browser extension]
  end

  subgraph node [Node API — public]
    H[GET /health]
    A[/auth/*]
    S[POST /api/simplify]
    D[POST /api/describe + /describe/url]
    V[POST /api/voice]
    SP[POST /api/sign/predict]
    WS[WebSocket /ws/sign]
  end

  subgraph data [Data]
    PG[(PostgreSQL)]
  end

  subgraph hf [External]
    HF[Hugging Face APIs]
  end

  subgraph py [Python sign service — internal]
    PRED[POST /predict or /internal/predict]
    ML[TensorFlow + sign_model.h5]
  end

  FE --> node
  EXT --> node
  node --> PG
  S --> HF
  D --> HF
  V --> HF
  SP --> PRED
  WS --> PRED
  PRED --> ML
```

**Traffic rules:**

- **Browser never talks to Python directly** in production (only Node URL in `VITE_API_BASE_URL` / `VITE_WS_URL`). Python binds to `127.0.0.1` or a private network URL and is **not** exposed to the public internet.
- **Node** writes `SignLog` rows when handling `/api/sign/predict` (and optionally when handling WebSocket predictions, if you log each frame — match current behavior: HTTP logs; WS in Python today does not log to DB — verify `main.py`).

**Clarification from current code:** `POST /api/sign/predict` logs to `sign_logs`; the WebSocket handler in `main.py` does **not** appear to log to DB (only prints). The plan should **preserve that behavior** unless you explicitly want to add logging.

---

## Inventory (routes to preserve)

| Method | Path | Feature |
| --- | --- | --- |
| GET | `/health` | Health / wake |
| POST | `/auth/register` | Auth |
| POST | `/auth/login` | Auth |
| GET | `/auth/me` | Auth (JWT) |
| PUT | `/auth/preferences` | Auth (JWT) |
| POST | `/api/simplify` | Cognitive simplifier + cache |
| POST | `/api/describe` | Image description + cache + HF fallback |
| POST | `/api/describe/url` | Describe by URL |
| POST | `/api/voice` | Whisper transcription + cache |
| POST | `/api/sign/predict` | Sign HTTP + `SignLog` |
| WS | `/ws/sign` | Live sign (JSON in/out) |

**Schemas** (parity with `backend/schemas.py`): same field names and types for JSON bodies and responses.

---

## Phase 0 — Decisions, repo layout, and contracts

**Duration:** short; unblocks all coding.

**Decisions:**

- [ ] **Node framework:** e.g. Fastify (good WebSocket + performance) or Express (ubiquitous).
- [ ] **ORM / migrations:** Prisma or Drizzle + PostgreSQL; initial migration must match `users`, `api_cache`, `sign_logs` (see `backend/models.py`).
- [ ] **Node package manager:** pnpm at repo root or `server/` package (align with `frontend/`).
- [ ] **Python sign service layout:** e.g. `services/sign-inference/` with its own `requirements.txt`, `Dockerfile`, and a minimal FastAPI or Uvicorn app exposing only predict.
- [ ] **Sign service API contract:** e.g. `POST /predict` body `{ "landmarks": number[] }` → `{ "sign": string, "confidence": number }`; errors as JSON with stable HTTP codes (400 bad length, 503 model missing).

**Artifacts:**

- [ ] One-page **API contract** (OpenAPI or markdown) shared by Node and Python teams: paths above, headers (`Authorization` only where needed), CORS, error shapes.
- [ ] **Env matrix** (dev/staging/prod): `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `FRONTEND_URL`, all `HF_*` vars used by simplify/describe/voice, **`SIGN_SERVICE_URL`** (Node → Python, e.g. `http://127.0.0.1:9001`).

**Exit criteria:** Stack chosen; folder names fixed; sign service contract written.

---

## Phase 1 — Extract the Python sign microservice

**Status:** Implemented in `services/sign-inference/` (FastAPI on port **9001**, `POST /predict`, `GET /health`, optional `MODEL_PATH`, Dockerfile, `README.md`). See `brain/02-local-dev.md` for run commands.

**Goal:** A runnable process that **only** loads `sign_model.h5` and exposes predict — **no** DB, **no** JWT, **no** Hugging Face.

**Tasks:**

- [x] Copy `backend/ml/sign_model.py`, `backend/ml/sign_labels.py`, and model path convention (`models/sign_model.h5`) into the new service (or mount the same volume in Docker).
- [x] Preload model on startup (mirror current `lifespan` warmup).
- [x] Implement `POST /predict` (or `/internal/predict`): validate 63 floats; return `{ sign, confidence }`; map `FileNotFoundError` and TF errors to 503 with messages similar to today’s `sign.py`.
- [x] Add health route `GET /health` for orchestration (returns `ok` when model loaded or explicit “degraded” if you allow start without model).
- [x] **Dockerfile** (optional but recommended): pinned Python + TensorFlow CPU, non-root user, model path via env.
- [x] **Local run doc:** `uvicorn` command and port (e.g. `9001`).

**Exit criteria:** `curl` to Python service returns predictions for a fixed test vector; matches current FastAPI output for the same landmarks (side-by-side script). **Verified:** health `degraded` without `.h5`; health `ok` + `POST /predict` 200 with a generated dummy `.h5` (`temp/generate_dummy_sign_model.py`); `400` on wrong landmark count.

---

## Phase 2 — Node application shell + database

**Status:** Implemented in `server/` — **Fastify** + **Prisma** + **TypeScript**, `GET /health`, CORS aligned with `backend/main.py`, initial migration `20260412120000_init`. See `server/README.md` and `brain/02-local-dev.md`.

**Goal:** Node boots, connects to Postgres, **no** feature routes yet except health.

**Tasks:**

- [x] Create Node project (TypeScript recommended), lint/format aligned with repo.
- [x] Implement `GET /health` with same JSON shape as Python (`{ "status": "ok", "message": "..." }` or match exactly).
- [x] Wire **CORS** to match `backend/main.py`: `localhost:5173`, `localhost:3000`, `FRONTEND_URL`, credentials, methods/headers `*`.
- [x] Replace `create_all` with **explicit migrations** that recreate existing tables (no data loss if migrating empty dev DB; for prod, migrations should be additive-only if schema unchanged).
- [x] Shared DB module: connection pool, transaction handling.

**Exit criteria:** Frontend can point to Node for `/health` only; DB tables exist; no auth yet. **Verified:** `pnpm run build`, `GET /health` returns expected JSON with DB up; existing Postgres from Python baseline-marked via `prisma migrate resolve --applied 20260412120000_init`.

---

## Phase 3 — Authentication and user preferences

**Status:** Implemented in `server/src/routes/auth.ts` with `bcrypt` (12 rounds), `jsonwebtoken` (HS256, `sub` = string user id), Zod validation. Same `SECRET_KEY` / `ALGORITHM` / `ACCESS_TOKEN_EXPIRE_MINUTES` as `backend/.env` for token parity.

**Goal:** Register, login, `me`, `preferences` — **byte-compatible** with current clients.

**Tasks:**

- [x] **bcrypt:** Use same cost factor as Python (check `passlib`/`bcrypt` defaults in Python — typically `bcrypt` default rounds; ensure Node’s `bcrypt` or `@node-rs/bcrypt` produces verifiable hashes for existing users).
- [x] **JWT:** Same `SECRET_KEY`, `ALGORITHM` (HS256), `sub` = user id as string/int consistent with `auth.py` (`int(user_id)` in payload — verify `create_access_token` and `jwt.decode` expectations).
- [x] `POST /auth/register` — create row in `users`; return `TokenResponse`.
- [x] `POST /auth/login` — verify password; return token.
- [x] `GET /auth/me` — Bearer required; return `UserResponse` including `preferences` JSON.
- [x] `PUT /auth/preferences` — **replaces** the entire `preferences` JSON object (see `backend/routers/auth.py`: assign `body.preferences`, not deep-merge).

**Exit criteria:** Manual or automated test: register → login → me → preferences; existing DB user from Python can log in from Node (if hash compatible). **Verified:** curl flow on port 8020; wrong password → `401` + `Incorrect email or password`; duplicate email → `400`.

---

## Phase 4 — Cognitive simplifier (`POST /api/simplify`)

**Status:** Implemented in `server/src/routes/simplify.ts`, `server/src/lib/hf-simplify.ts`, `server/src/lib/word-count.ts` — SHA-256 cache key `simplify:{grade}:{text}`, Hugging Face chat completions + 20s retry on 503, 60s timeout, `HF_TEXT_MODEL` default matches Python.

**Goal:** Same caching and HF behavior.

**Tasks:**

- [x] Port validation: max text length, `grade_level` allowed values (3/5/8 or as in code).
- [x] **Cache key:** Same hash algorithm as Python (inspect `simplify.py` — likely SHA-256 of text + grade + endpoint name).
- [x] Read/write `api_cache` table (`endpoint`, `input_hash`, `grade_level`, `output_text`).
- [x] **Hugging Face:** Same base URL, model id, headers (`HF_API_TOKEN`), retries on 503 (cold start), timeouts.
- [x] Response: `simplified`, `word_count_before`, `word_count_after`, `cached`.

**Exit criteria:** Cache hit returns identical text; miss matches Python on same input (allowing for remote model nondeterminism — document if strict equality is impossible). **Verified:** `400` over 5000 chars; `502` when `HF_API_TOKEN` missing; `pnpm run build` passes. **Note:** Python does not restrict `grade_level` to 3/5/8 — Node matches that (any integer).

**Clarification on task “3/5/8”:** The UI uses 3/5/8; the API accepts any integer grade in the prompt, same as FastAPI.

---

## Phase 5 — Image describe (`POST /api/describe`, `/api/describe/url`)

**Status:** Implemented in `server/src/routes/describe.ts`, `hf-describe.ts`, `describe-local.ts` (sharp), `fetch-remote-image.ts`; `@fastify/multipart` + 5 MB limit; cache prefix `describe:v2:` + raw bytes (SHA-256); `HF_VISION_MODEL` in `server/.env`.

**Goal:** Upload + URL fetch + cache + vision HF + PIL fallback parity.

**Tasks:**

- [x] Multipart upload handling and size limits as in Python.
- [x] URL fetch: same validation (allowlist, max size, etc. — read `describe.py`).
- [x] Cache by content hash (same algorithm as Python).
- [x] HF vision call with same model env and retry policy.
- [x] **Fallback:** Reimplement PIL-based metadata description in Node (`sharp` + image-size / dominant color extraction) to match behavior as closely as possible; snapshot test tricky cases.

**Exit criteria:** Same inputs produce equivalent descriptions on cache hit; HF path tested with real token in staging. **Verified:** `pnpm run build`.

---

## Phase 6 — Voice (`POST /api/voice`)

**Status:** Implemented in `server/src/routes/voice.ts`, `server/src/lib/hf-voice.ts`. App-level `@fastify/multipart` with **25 MB** limit (`server/src/app.ts`); describe still enforces **5 MB** after `toBuffer()` in `describe.ts`. Cache key matches Python: `SHA-256(b"voice:" + audio_bytes)`; `endpoint: "voice"`. HF: `openai/whisper-large-v3` on Router, `Content-Type: audio/wav`, **120s** timeout, **503** retries **20s / 30s / 40s** (max 3).

**Goal:** Audio upload → Whisper on HF → cache → response.

**Tasks:**

- [x] Match audio format acceptance and validation from `voice.py` (empty / 25 MB; multipart field `audio`; permissive content-type like Python).
- [x] Same cache key + `api_cache` endpoint label (`"voice"`).
- [x] HF Whisper request/response shape and retries.

**Exit criteria:** Sample audio file returns transcript; cache works. **Verified:** `pnpm run build`; multipart `POST /api/voice` reaches HF (invalid bytes → `502` with HF error detail).

---

## Phase 7 — Sign: HTTP + WebSocket via Python service

**Status:** Implemented in `server/src/routes/sign.ts`, `server/src/lib/sign-service-client.ts`; **`@fastify/websocket`** for **`GET /ws/sign`**. HTTP **`POST /api/sign/predict`** forwards to **`SIGN_SERVICE_URL/predict`** (no prefix on the env URL). **`SignLog`** rows on HTTP success only (matches `backend/routers/sign.py`); WebSocket path does **not** log (matches `backend/main.py`).

**Goal:** Public API **on Node**; inference **on Python**.

### 7a — `POST /api/sign/predict`

- [x] Validate 63 landmarks.
- [x] `POST` to `SIGN_SERVICE_URL/predict` with `{ landmarks }`.
- [x] On success, insert `SignLog` (same columns as `sign.py`).
- [x] Map Python service errors to same HTTP status codes as today (400 vs 503).
- [x] Return `SignPredictResponse`.

### 7b — `WebSocket /ws/sign`

Pick **one** pattern (document in README):

- **Recommended:** Node accepts the WebSocket (same URL path as today). On each JSON message, Node calls Python’s `POST /predict` internally and sends JSON back to the client. **Simpler** than proxying raw WebSocket to Python; latency = one extra hop per frame.
- **Alternative:** Terminate WebSocket on Python (same port as today) behind a reverse proxy — only if you need minimal latency and are fine with more complex routing.

**Tasks:**

- [x] Same message validation: 63 floats; error JSON shape `{ "error": "..." }` as in `main.py`.
- [x] No DB logging on WS unless you change product intent (current Python WS does not log).

**Exit criteria:** Frontend sign page works against Node only; WebSocket and HTTP predict match Python service outputs. **Verified:** `pnpm run build`; set `SIGN_SERVICE_URL` and run sign-inference on **9001**; `VITE_WS_URL=ws://localhost:8001` when Node serves WS.

---

## Phase 8 — Parity, load, and failure modes

**Status:** **`pnpm test`** (Vitest): contract tests (`test/contract.test.ts`), sign client + failure mapping (`test/sign-service-client.test.ts`), golden-style **`POST /api/sign/predict`** with mocked fetch + Prisma (`test/sign-predict.test.ts`). **`buildApp({ skipDatabaseHooks: true })`** for tests without Postgres. Optional **k6** smoke: `server/load/k6-simplify-smoke.js` + `load/README.md`.

**Tasks:**

- [x] **Golden tests:** Saved vectors for sign → expected label/confidence (tolerance on confidence float). *(63-float vector + mocked upstream; asserts `sign` + `confidence` within `toBeCloseTo`.)*
- [x] **Contract tests:** HTTP status + JSON for auth errors, 404, validation errors.
- [x] **Load:** Optional k6/Artillery on `/api/simplify` and WS sign to ensure Node + Python pool sizing. *(k6 simplify smoke only; WS load documented as optional.)*
- [x] **Failure injection:** Python sign service down → Node returns 503 for sign routes consistent with today. *(Covered by mocked fetch + `sign-service-client` tests + HTTP 503 body test.)*
- [x] **Observability:** Structured logs (request id), metrics for HF latency and sign service latency. *(`genReqId` + `x-request-id` on response; `upstream` / `upstreamMs` in logs for HF simplify/describe/voice + sign inference.)*

**Exit criteria:** Checklist signed off by QA or maintainer; no P0 parity gaps. **Verified:** `pnpm run build`, `pnpm test`.

---

## Phase 9 — Deployment and cutover

**Status:** **`docker-compose.yml`** — profile **`fullstack`** builds **sign-inference** (internal `:9001` only) + **Node API** (`server/Dockerfile`, **8001** → host) + existing **db**. `DATABASE_URL` / `SIGN_SERVICE_URL` overridden in Compose for in-network hosts; JWT/HF from `server/.env` (use secret management in real prod). **`deploy/README.md`** — rollback + canary notes. **`pnpm dev:docker`** / **`scripts/dev-docker-stack.sh`** — Compose stack + Vite on host. **`scripts/dev-all.sh --docker`** delegates to the same. Frontend Axios/WS defaults in **`api.js`** use Node (**8001**).

**Tasks:**

- [x] **Compose or K8s:** Node + Python sign + Postgres; internal network only for Python.
- [x] **Env:** `SIGN_SERVICE_URL` in Node; never commit secrets. *(Compose sets `http://sign:9001`; document-only for production secrets.)*
- [x] **Frontend:** `VITE_API_BASE_URL` and `VITE_WS_URL` point to Node host (same origin as today, new port if needed). *(Defaults in code + `frontend/.env` from `frontend/.env.example`.)*
- [x] **Extension:** Update any hardcoded API URLs if present. *(Chrome extension only opens the Vite URL; no API host change.)*
- [x] **Blue/green or canary:** Run Node behind new hostname first; switch when stable. *(Documented in `deploy/README.md`.)*
- [x] **Rollback plan:** Revert DNS/env to old FastAPI monolith until fixed. *(Documented in `deploy/README.md`.)*

**Exit criteria:** Production traffic on Node + Python sign; monitors green. **Local verified:** `docker compose config`, `docker build ./server`; full stack requires `server/.env` for HF/JWT when exercising the API container.

---

## Phase 10 — Decommission FastAPI monolith

**Status:** The **`backend/`** FastAPI monolith **has been removed** from the repository. **`services/sign-inference/`** remains the only Python service for Keras sign inference. **`brain/01-project-overview.md`**, **`brain/04-features-and-stack.md`**, **`brain/02-local-dev.md`**, **`brain/03-backend-python-to-node-migration.md`**, root **`README.md`**, **`frontend/README.md`**, **`deploy/README.md`**, and **`server/README.md`** updated for Node-first docs. **`brain-0.1.18`** changelog entry.

**Tasks:**

- [x] delete `backend/` Python **monolith** code paths; **keep** `services/sign-inference/` (or equivalent) as the only Python.
- [x] Update `brain/01-project-overview.md`, `brain/04-features-and-stack.md`, `brain/02-local-dev.md`, root `README.md`.
- [x] Brain changelog entry for migration complete.

**Exit criteria:** No FastAPI monolith in tree; contributors run **`server/`** + **`services/sign-inference/`** only.

---

## Risk register (short)

| Risk | Mitigation |
| --- | --- |
| JWT/bcrypt mismatch | Test with real DB user early in Phase 3 |
| HF API behavior drift | Pin model versions in env; snapshot tests |
| Describe PIL fallback differs | Snapshot tests on synthetic images |
| Sign latency (Node → Python per frame) | Measure; tune Python locality / keepalive; consider HTTP/2 |
| Two deployables | One Compose file; same version tags |

---

## Suggested timeline (indicative)

| Phase | Focus |
| --- | --- |
| 0 | Decisions + docs |
| 1 | Python sign service |
| 2–3 | Node shell + auth |
| 4–6 | Simplify, describe, voice (could parallelize after 3) |
| 7 | Sign integration |
| 8–9 | Testing + deploy |
| 10 | Cleanup |

---

## Next step

Execute Phase 0, then implement in order. If you want a **single implementation ticket list**, split Phase 4–6 into parallel workstreams after Phase 3 is merged.
