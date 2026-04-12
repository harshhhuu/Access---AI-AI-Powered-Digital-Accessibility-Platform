# Backend migration: Python → Node

> **Status (Phase 10):** Migration is **complete**. The FastAPI monolith (`backend/`) has been **removed** from the repo. The live API is **`server/`** (Fastify + Prisma); sign inference remains **`services/sign-inference/`**. This document is kept as a **historical checklist**.

---

Checklist for moving the AccessAI API from the former **FastAPI** stack to a **Node.js** server while preserving behavior for the React app and extension.

**Context (former monolith, removed):** FastAPI app with JWT auth, SQLAlchemy + PostgreSQL, routers (simplify, describe, voice, sign), WebSocket `/ws/sign`, and TensorFlow/Keras for sign — superseded by Node + the sign microservice.

---

## 0. Decisions to lock before deep work

These shape the rest of the checklist; resolve them explicitly (in planning or a short design note).

- [ ] **Node framework:** e.g. Fastify or Express (or Nest if you want structure parity with larger teams). Pick one and standardize middleware patterns (CORS, auth, JSON, errors).
- [ ] **ORM / query layer:** e.g. Prisma, Drizzle, Kysely, or raw `pg` — must support PostgreSQL, JSON columns, and migrations compatible with existing tables.
- [ ] **Sign-language ML strategy (critical):** The runtime depends on **TensorFlow** and a **`.h5` Keras** model. Options:
  - **TensorFlow.js** in Node: load converted model; validate accuracy/latency vs Python.
  - **ONNX Runtime** (Node): export model to ONNX from Python once; run inference in Node.
  - **Keep a small Python (or other) inference service** for sign only; Node proxies HTTP/WebSocket. Lowest migration risk for the model; two runtimes in production.
  - **Defer:** document “sign features require separate service” until ML path is chosen.
- [ ] **Package manager for Node:** repo rules prefer **pnpm** for JS; align `frontend/` and new server tooling.

---

## 1. Inventory and parity matrix

- [ ] List every **HTTP route** (method + path) from Python routers and `main.py` (`/health`, `/auth/*`, `/api/*`, etc.).
- [ ] List **WebSocket** endpoints (`/ws/sign`): message shapes in/out (already documented in `main.py`).
- [ ] List **env vars** read by the backend (e.g. `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `FRONTEND_URL`) and where the frontend/extension configure the API base URL.
- [ ] Capture **request/response shapes** (Pydantic schemas in `backend/schemas.py`) so Node validation matches (Zod, TypeBox, or equivalent).
- [ ] Note **side effects:** DB tables created at startup (`Base.metadata.create_all`), model pre-warm on lifespan — decide equivalent startup hooks in Node.

---

## 2. Database and data migration

- [ ] Map SQLAlchemy models (`User`, `APICache`, `SignLog`) to the Node schema layer; **preserve table names and column types** where possible to avoid data migration.
- [ ] Plan **migrations** (Prisma Migrate, Drizzle Kit, etc.) vs one-time SQL if you rename anything.
- [ ] Verify **JSON/JSONB** fields (`preferences`, `landmark_json`) serialize the same way clients expect.
- [ ] Confirm **password hashes** remain valid: same bcrypt settings when registering/login from Node (existing `users` rows must keep working).

---

## 3. Authentication and security

- [ ] Reimplement **JWT** creation and verification compatible with existing tokens: same **secret**, **algorithm**, **claims** (`sub` as user id), and **expiry** semantics unless you force re-login at cutover.
- [ ] Reimplement **OAuth2 password flow** parity: login route, Bearer extraction, protected routes — match status codes and error bodies the frontend relies on.
- [ ] **CORS:** replicate `CORSMiddleware` origins (`localhost` ports, `FRONTEND_URL`) and `allow_credentials` behavior.
- [ ] Audit **secrets**: no defaults like `"changeme"` in production; env-only configuration.

---

## 4. API routes (feature parity)

Work router-by-router (files under `backend/routers/`), checking each for external APIs (HTTP clients), caching (`APICache`), and file uploads if any.

- [ ] **Auth** (`routers/auth.py`): register, login, me — match responses and errors.
- [ ] **Simplify** (`routers/simplify.py`): grade level, caching, any LLM/API calls — same keys and rate limits.
- [ ] **Describe** (`routers/describe.py`): same as above for vision/describe pipeline.
- [ ] **Voice** (`routers/voice.py`): audio handling, transcription, caching.
- [ ] **Sign** (`routers/sign.py`): REST predict path if present; align with WebSocket behavior.
- [ ] **Health** (`GET /health`): same JSON for uptime checks / Render wake-up.

---

## 5. WebSockets (sign)

- [ ] Implement `/ws/sign` with the same **accept**, **JSON in/out**, and **error** messages (e.g. 63 landmarks validation).
- [ ] Connect WebSocket handler to the chosen **ML inference** path (see §0); load model on startup if you need to avoid cold latency like the Python `lifespan` pre-warm.
- [ ] Load **label list** parity with `backend/ml/sign_labels.py` (same order as model output).

---

## 6. ML assets and ops

- [ ] Decide location for `sign_model.h5` or converted artifacts in repo or deployment (ignore large binaries in git if policy requires; document fetch at build/deploy).
- [ ] If converting models (TF.js / ONNX), add a **validation script** comparing outputs vs Python on a fixed set of landmark vectors.
- [ ] Document **memory/CPU** needs for inference on the host (TensorFlow in Node can differ from Python).

---

## 7. Testing and verification

- [ ] Port or replace `backend/smoke_test.py` with Node tests or a small script hitting `/health`, sample auth, and one cached endpoint.
- [ ] Add **contract tests** (or manual checklist) for responses the frontend depends on.
- [ ] **WebSocket** integration test: send 63-float payload, assert sign + confidence shape.

---

## 8. Frontend, extension, and deployment

- [ ] Update **API base URL** and WebSocket URL in `frontend/`, `extension/`, and CI if hardcoded.
- [ ] Replace **Python start command** (e.g. uvicorn) with **Node** (`node`, `tsx`, or compiled output) in README, `brain/02-local-dev.md`, and hosting config (Render, Vercel serverless vs long-lived Node, etc.).
- [ ] If deploying to **serverless**, confirm WebSockets and long-lived ML load are supported; otherwise use a **container** or **VM** for the Node server.
- [ ] **Staged rollout:** run Node behind a flag or subdomain, then switch DNS/env when parity is proven.

---

## 9. Decommission Python backend

- [x] Remove or archive `backend/` Python code only after cutover and rollback plan is clear.
- [x] Update `brain/01-project-overview.md` and root `README.md` to describe Node as the API server.
- [x] Keep `CHANGELOG.md` (brain) entry for the migration milestone.

---

## Scope boundaries (suggested)

- **In scope:** API parity, auth compatibility, DB compatibility, sign inference available to clients with acceptable latency.
- **Out of scope (unless explicitly added):** rewriting ML training pipelines in Node, changing model architecture, or large frontend refactors beyond API URL/config.

---

## Suggested order of execution

1. Decide ML strategy for sign (§0) — blocks confidence in WebSocket + `/api/sign` behavior.  
2. Stand up Node app with `/health` + DB connection + migrations.  
3. Auth + one simple route to prove JWT and DB.  
4. Remaining HTTP routes + caching behavior.  
5. WebSocket + inference.  
6. End-to-end tests and deployment switch.

When this checklist is satisfied, run structured implementation planning (e.g. `/ce:plan`) against the chosen stack and ML approach.
