# AccessAI — features & technology stack

How the main product areas work end-to-end and which libraries or services they use.

---

## Architecture (high level)

| Layer | Technology |
| --- | --- |
| Web UI | React 19, Vite 7, React Router 7, Tailwind CSS 4, shadcn-style UI (Radix, CVA, `tailwind-merge`) |
| HTTP client | Axios (`VITE_API_BASE_URL`, default `http://localhost:8001`) |
| Real-time (sign) | WebSocket `ws://…/ws/sign` (`VITE_WS_URL` + path) — served by **Node**, which proxies to **sign-inference** |
| Backend API | **Node** (Fastify + Prisma + PostgreSQL) in `server/` |
| Sign ML (internal) | Python **`services/sign-inference/`** — TensorFlow Keras `sign_model.h5`, `POST /predict` |
| ML (browser) | TensorFlow.js, `@tensorflow-models/hand-pose-detection`, `@mediapipe/hands` (hand landmarks) |
| External AI | Hugging Face Inference / Router (`HF_API_TOKEN`, models via env) |
| Auth | JWT (`SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`), bcrypt passwords |
| P2P video | PeerJS (WebRTC) on the Video Call page |
| Browser extension | Chrome MV3 (service worker, content scripts) |

Environment variables: **`server/.env`** (API + secrets) and **`frontend/.env`** (public API/WS base URLs). See `brain/02-local-dev.md`.

---

## Backend API (Node — `server/`)

### Health

- **`GET /health`** — lightweight ping.

### Auth (`/auth`)

- **`POST /auth/register`**, **`POST /auth/login`** — email + password; returns JWT `access_token`.
- **`GET /auth/me`**, **`PUT /auth/preferences`** — protected routes; preferences stored on the user record.

Uses PostgreSQL via Prisma; passwords hashed with bcrypt.

### Cognitive text simplifier (`POST /api/simplify`)

Validates length → **PostgreSQL cache** (hash) → Hugging Face chat completions → cache write → response with word counts. Retries on HF cold starts (503).

### Image description (`POST /api/describe`, `/api/describe/url`)

Image bytes → cache → HF vision → cache. On certain failures, **sharp**-based local metadata fallback (parity with prior PIL behavior).

### Voice (`POST /api/voice`)

Audio → HF Whisper (`openai/whisper-large-v3` via Router), with retries; cached by content hash.

### Sign language (`POST /api/sign/predict` + **`WebSocket /ws/sign`**)

- **Purpose:** Map **63 hand landmark floats** to a **label** (e.g. hello, yes, help).
- **Inference:** Node forwards to **`services/sign-inference`** (`SIGN_SERVICE_URL`). Keras model lives under **`services/sign-inference/models/`** (not in the repo unless you add `sign_model.h5`).
- **WebSocket:** Client sends `{ "landmarks": [ … 63 floats ] }`; Node proxies to Python and returns prediction JSON. HTTP path can write **`sign_logs`**; WebSocket does not log each frame.

### CORS

Allows local dev origins and `FRONTEND_URL` from env.

---

## Frontend (React + Vite)

### Routes (typical)

- **Home** — marketing / entry to features.
- **`/simplify`** — Cognitive text simplifier → `POST /api/simplify`.
- **`/image`** — upload or URL → describe API.
- **`/sign`** — webcam + MediaPipe; optional TF.js model in `public/models/sign_model/`; WebSocket to **Node** for server-side predictions; TTS for feedback.
- **`/voice`** — Voice Navigator: **Web Speech API** in `useVoiceNav.jsx` (browser-first; optional server transcription via `/api/voice` when wired).
- **`/call`** — PeerJS video/audio.
- **`/profiles`** — Accessibility presets (localStorage, etc.).

### Global accessibility (`AccessibilityContext`)

Settings persisted in **localStorage**; hover image descriptions call the describe API when enabled.

---

## Browser extension (`extension/`)

**Manifest V3** — opens the web app URL (see `extension/background.js`). API calls go through the **same-origin** web app and its env-configured base URL.

---

## Data & caching

- **PostgreSQL:** users, **api_cache** (simplify/describe/voice), **sign_logs** (HTTP sign predict).
- **Hashes** tie cache rows to inputs.

---

## External services (summary)

| Service | Used for |
| --- | --- |
| Hugging Face Inference / Router | Text simplification, image captioning, Whisper |
| (Optional) CDN | MediaPipe `locateFile` for Hands WASM |

---

## Typical local run

1. **PostgreSQL** (e.g. `docker compose up -d`) matching `DATABASE_URL` in **`server/.env`**.
2. **`server/.env`** — `DATABASE_URL`, `HF_*`, `SECRET_KEY`, **`SIGN_SERVICE_URL`** for sign-inference.
3. **`pnpm dev`** from repo root (see `brain/02-local-dev.md`), or run **`server`** + **`frontend`** + **`services/sign-inference`** separately.

---

## Related docs

- Root **`README.md`** — overview and setup.
- **`brain/02-local-dev.md`** — env files and Docker Postgres.
- **`server/README.md`** — Node API routes and scripts.
