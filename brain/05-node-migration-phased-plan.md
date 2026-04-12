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

**Goal:** A runnable process that **only** loads `sign_model.h5` and exposes predict — **no** DB, **no** JWT, **no** Hugging Face.

**Tasks:**

- [ ] Copy `backend/ml/sign_model.py`, `backend/ml/sign_labels.py`, and model path convention (`models/sign_model.h5`) into the new service (or mount the same volume in Docker).
- [ ] Preload model on startup (mirror current `lifespan` warmup).
- [ ] Implement `POST /predict` (or `/internal/predict`): validate 63 floats; return `{ sign, confidence }`; map `FileNotFoundError` and TF errors to 503 with messages similar to today’s `sign.py`.
- [ ] Add health route `GET /health` for orchestration (returns `ok` when model loaded or explicit “degraded” if you allow start without model).
- [ ] **Dockerfile** (optional but recommended): pinned Python + TensorFlow CPU, non-root user, model path via env.
- [ ] **Local run doc:** `uvicorn` command and port (e.g. `9001`).

**Exit criteria:** `curl` to Python service returns predictions for a fixed test vector; matches current FastAPI output for the same landmarks (side-by-side script).

---

## Phase 2 — Node application shell + database

**Goal:** Node boots, connects to Postgres, **no** feature routes yet except health.

**Tasks:**

- [ ] Create Node project (TypeScript recommended), lint/format aligned with repo.
- [ ] Implement `GET /health` with same JSON shape as Python (`{ "status": "ok", "message": "..." }` or match exactly).
- [ ] Wire **CORS** to match `backend/main.py`: `localhost:5173`, `localhost:3000`, `FRONTEND_URL`, credentials, methods/headers `*`.
- [ ] Replace `create_all` with **explicit migrations** that recreate existing tables (no data loss if migrating empty dev DB; for prod, migrations should be additive-only if schema unchanged).
- [ ] Shared DB module: connection pool, transaction handling.

**Exit criteria:** Frontend can point to Node for `/health` only; DB tables exist; no auth yet.

---

## Phase 3 — Authentication and user preferences

**Goal:** Register, login, `me`, `preferences` — **byte-compatible** with current clients.

**Tasks:**

- [ ] **bcrypt:** Use same cost factor as Python (check `passlib`/`bcrypt` defaults in Python — typically `bcrypt` default rounds; ensure Node’s `bcrypt` or `@node-rs/bcrypt` produces verifiable hashes for existing users).
- [ ] **JWT:** Same `SECRET_KEY`, `ALGORITHM` (HS256), `sub` = user id as string/int consistent with `auth.py` (`int(user_id)` in payload — verify `create_access_token` and `jwt.decode` expectations).
- [ ] `POST /auth/register` — create row in `users`; return `TokenResponse`.
- [ ] `POST /auth/login` — verify password; return token.
- [ ] `GET /auth/me` — Bearer required; return `UserResponse` including `preferences` JSON.
- [ ] `PUT /auth/preferences` — **replaces** the entire `preferences` JSON object (see `backend/routers/auth.py`: assign `body.preferences`, not deep-merge).

**Exit criteria:** Manual or automated test: register → login → me → preferences; existing DB user from Python can log in from Node (if hash compatible).

---

## Phase 4 — Cognitive simplifier (`POST /api/simplify`)

**Goal:** Same caching and HF behavior.

**Tasks:**

- [ ] Port validation: max text length, `grade_level` allowed values (3/5/8 or as in code).
- [ ] **Cache key:** Same hash algorithm as Python (inspect `simplify.py` — likely SHA-256 of text + grade + endpoint name).
- [ ] Read/write `api_cache` table (`endpoint`, `input_hash`, `grade_level`, `output_text`).
- [ ] **Hugging Face:** Same base URL, model id, headers (`HF_API_TOKEN`), retries on 503 (cold start), timeouts.
- [ ] Response: `simplified`, `word_count_before`, `word_count_after`, `cached`.

**Exit criteria:** Cache hit returns identical text; miss matches Python on same input (allowing for remote model nondeterminism — document if strict equality is impossible).

---

## Phase 5 — Image describe (`POST /api/describe`, `/api/describe/url`)

**Goal:** Upload + URL fetch + cache + vision HF + PIL fallback parity.

**Tasks:**

- [ ] Multipart upload handling and size limits as in Python.
- [ ] URL fetch: same validation (allowlist, max size, etc. — read `describe.py`).
- [ ] Cache by content hash (same algorithm as Python).
- [ ] HF vision call with same model env and retry policy.
- [ ] **Fallback:** Reimplement PIL-based metadata description in Node (`sharp` + image-size / dominant color extraction) to match behavior as closely as possible; snapshot test tricky cases.

**Exit criteria:** Same inputs produce equivalent descriptions on cache hit; HF path tested with real token in staging.

---

## Phase 6 — Voice (`POST /api/voice`)

**Goal:** Audio upload → Whisper on HF → cache → response.

**Tasks:**

- [ ] Match audio format acceptance and validation from `voice.py`.
- [ ] Same cache key + `api_cache` endpoint label (`"voice"`).
- [ ] HF Whisper request/response shape and retries.

**Exit criteria:** Sample audio file returns transcript; cache works.

---

## Phase 7 — Sign: HTTP + WebSocket via Python service

**Goal:** Public API **on Node**; inference **on Python**.

### 7a — `POST /api/sign/predict`

- [ ] Validate 63 landmarks.
- [ ] `POST` to `SIGN_SERVICE_URL/predict` with `{ landmarks }`.
- [ ] On success, insert `SignLog` (same columns as `sign.py`).
- [ ] Map Python service errors to same HTTP status codes as today (400 vs 503).
- [ ] Return `SignPredictResponse`.

### 7b — `WebSocket /ws/sign`

Pick **one** pattern (document in README):

- **Recommended:** Node accepts the WebSocket (same URL path as today). On each JSON message, Node calls Python’s `POST /predict` internally and sends JSON back to the client. **Simpler** than proxying raw WebSocket to Python; latency = one extra hop per frame.
- **Alternative:** Terminate WebSocket on Python (same port as today) behind a reverse proxy — only if you need minimal latency and are fine with more complex routing.

**Tasks:**

- [ ] Same message validation: 63 floats; error JSON shape `{ "error": "..." }` as in `main.py`.
- [ ] No DB logging on WS unless you change product intent (current Python WS does not log).

**Exit criteria:** Frontend sign page works against Node only; WebSocket and HTTP predict match Python service outputs.

---

## Phase 8 — Parity, load, and failure modes

**Tasks:**

- [ ] **Golden tests:** Saved vectors for sign → expected label/confidence (tolerance on confidence float).
- [ ] **Contract tests:** HTTP status + JSON for auth errors, 404, validation errors.
- [ ] **Load:** Optional k6/Artillery on `/api/simplify` and WS sign to ensure Node + Python pool sizing.
- [ ] **Failure injection:** Python sign service down → Node returns 503 for sign routes consistent with today.
- [ ] **Observability:** Structured logs (request id), metrics for HF latency and sign service latency.

**Exit criteria:** Checklist signed off by QA or maintainer; no P0 parity gaps.

---

## Phase 9 — Deployment and cutover

**Tasks:**

- [ ] **Compose or K8s:** Node + Python sign + Postgres; internal network only for Python.
- [ ] **Env:** `SIGN_SERVICE_URL` in Node; never commit secrets.
- [ ] **Frontend:** `VITE_API_BASE_URL` and `VITE_WS_URL` point to Node host (same origin as today, new port if needed).
- [ ] **Extension:** Update any hardcoded API URLs if present.
- [ ] **Blue/green or canary:** Run Node behind new hostname first; switch when stable.
- [ ] **Rollback plan:** Revert DNS/env to old FastAPI monolith until fixed.

**Exit criteria:** Production traffic on Node + Python sign; monitors green.

---

## Phase 10 — Decommission FastAPI monolith

**Tasks:**

- [ ] Archive or delete `backend/` Python **monolith** code paths; **keep** `services/sign-inference/` (or equivalent) as the only Python.
- [ ] Update `brain/01-project-overview.md`, `brain/04-features-and-stack.md`, `brain/02-local-dev.md`, root `README.md`.
- [ ] Brain changelog entry for migration complete.

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
