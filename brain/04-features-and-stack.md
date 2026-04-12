# AccessAI — features & technology stack

How the main product areas work end-to-end and which libraries or services they use.

---

## Architecture (high level)

| Layer | Technology |
| --- | --- |
| Web UI | React 19, Vite 7, React Router 7, Tailwind CSS 4, shadcn-style UI (Radix, CVA, `tailwind-merge`) |
| HTTP client | Axios (`VITE_API_BASE_URL`, default `http://localhost:8001` for Node API) |
| Real-time (sign) | WebSocket `ws://…/ws/sign` (`VITE_WS_URL` + path) |
| Backend API | FastAPI (Python), Uvicorn, SQLAlchemy, PostgreSQL |
| ML (server) | TensorFlow (Keras) for sign language `.h5`; NumPy |
| ML (browser) | TensorFlow.js, `@tensorflow-models/hand-pose-detection`, `@mediapipe/hands` (hand landmarks) |
| External AI | Hugging Face Inference / Router (`HF_API_TOKEN`, models via env) |
| Auth | JWT (`SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`), bcrypt passwords |
| P2P video | PeerJS (WebRTC) on the Video Call page |
| Browser extension | Chrome MV3 (service worker, content scripts) |

Environment variables live in `backend/.env` and `frontend/.env` (see `backend/README.md` and `brain/02-local-dev.md`).

---

## Backend (FastAPI)

### Health

- **`GET /health`** — lightweight ping (useful if the host sleeps idle tiers).

### Auth (`/auth`)

- **`POST /auth/register`**, **`POST /auth/login`** — email + password; returns JWT `access_token`.
- **`GET /auth/me`**, **`PUT /auth/preferences`** — protected routes; preferences stored on the user record.

Uses PostgreSQL via SQLAlchemy; passwords hashed with bcrypt.

### Cognitive text simplifier (`POST /api/simplify`)

- **Purpose:** Rewrite long or formal text at a chosen reading level (e.g. grade 3 / 5 / 8).
- **Flow:** Validates length → checks **PostgreSQL cache** (hash of text + grade) → if miss, calls **Hugging Face chat completions** (`HF_TEXT_MODEL`, default `Qwen/Qwen2.5-72B-Instruct:novita` via `router.huggingface.co`) → stores result in cache → returns simplified text and word counts.
- **Retries:** On HTTP 503 (model cold start), waits and retries similarly to other HF routes.

### Image description (`/api/describe` …)

- **Purpose:** Short natural-language description of an image for blind/low-vision users.
- **Flow:** Image bytes → cache lookup by content hash → **Hugging Face vision chat** (`HF_VISION_MODEL`, e.g. `CohereLabs/aya-vision-32b:cohere`) → cache write. If the remote call fails with certain errors, a **local PIL-based fallback** (size, rough color, orientation) may be used.
- Supports **upload** and **URL** variants (server fetches remote images with validation).

### Voice / transcription (`/api/voice` …)

- **Purpose:** Transcribe audio when the browser cannot do speech recognition locally.
- **Flow:** Audio upload → **Hugging Face Whisper** (`openai/whisper-large-v3` on the HF inference endpoint used in code), with retries on cold starts.

### Sign language (`/api/sign/predict` + **`WebSocket /ws/sign`**)

- **Purpose:** Map **63 hand landmark floats** (21 points × x/y/z, wrist-normalised) to a **label** (e.g. hello, yes, help).
- **Server:** TensorFlow Keras model `backend/models/sign_model.h5` loaded via `ml/sign_model.py`; **`predict()`** returns `{ sign, confidence }`.
- **WebSocket:** Client sends JSON `{ "landmarks": [ … 63 floats ] }`; server responds with prediction JSON. Used for continuous webcam pipelines.
- **HTTP:** Same model for single-shot / testing.

### Startup

- Preloads the sign Keras model when possible.
- **`Base.metadata.create_all`** ensures DB tables exist.

### CORS

- Allows local dev origins (`localhost:5173`, etc.) and `FRONTEND_URL` from env for deployment.

---

## Frontend (React + Vite)

### Routes (typical)

- **Home** — marketing / entry to features.
- **`/simplify`** — Cognitive text simplifier: calls **`simplifyText()`** → `POST /api/simplify`. If the API fails, a **demo article + cached outputs** can still work offline for demos.
- **`/image`** (`ImageDescribe`) — upload or URL; **`describeImage` / `describeImageByUrl`** → describe API.
- **`/sign`** — Sign language: webcam + **MediaPipe Hands** (browser) for landmarks; optional **TF.js graph model** in `public/models/sign_model/` for on-device classification; **WebSocket** to backend for server-side predictions; TTS for feedback.
- **`/voice`** — **Voice Navigator:** **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) in `useVoiceNav.jsx`; keyword commands scroll, navigate routes, toggle accessibility settings. No backend required for core navigation (browser-only).
- **`/call`** — **VideoCall:** peer-to-peer video/audio via **PeerJS**; can reuse sign-detection hooks for captions.
- **`/profiles`** — Accessibility presets (font size, contrast, Priya mode, hover descriptions, colour-blind filters, TTS speed).

### Global accessibility (`AccessibilityContext`)

- Settings persisted in **localStorage** (`accessai_settings_v2`, profiles).
- **Priya mode** and related flags can drive UI (e.g. keeping sign/camera flows active).
- **Hover image descriptions:** `GlobalHoverListener` in `App.jsx` — on hover over large `<img>`, calls describe API (blob/data URL vs remote URL) and speaks the result; on failure uses a fixed fallback string.

### Styling / UX

- Tailwind + custom CSS-in-JS blocks per page; **Lucide** icons; optional **OpenDyslexic** font on Simplify when enabled.

---

## Browser extension (`extension/`)

- **Manifest V3** — “AccessAI Voice Launcher”: background service worker + content scripts.
- **Intent:** Voice phrase (e.g. “Open AccessAI”) to open the app; uses `tabs`, `storage`, `activeTab`, broad host permissions for injection.
- **Separate** from the React app bundle; load unpacked in Chrome/Edge for testing.

---

## Data & caching

- **PostgreSQL** stores users, **API response cache** (`APICache`) for simplify/describe, and sign logs where implemented.
- **Hashes** tie cache rows to inputs (text+grade or image bytes).

---

## External services (summary)

| Service | Used for |
| --- | --- |
| Hugging Face Inference / Router | Text simplification, image captioning, Whisper transcription |
| (Optional) CDN | MediaPipe `locateFile` assets for Hands WASM (see `mediapipeHandsClient.js`) |

---

## Typical local run

1. **PostgreSQL** running and matching `DATABASE_URL`.
2. **`backend/.env`** with `DATABASE_URL`, `HF_API_TOKEN`, model names, `SECRET_KEY`, etc.
3. **Backend:** `cd backend && source venv/bin/activate && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
4. **Frontend:** `cd frontend && pnpm dev` with `VITE_API_BASE_URL` and `VITE_WS_URL` pointing at the API.

---

## Related docs

- Root **`README.md`** — feature overview and setup snippets.
- **`brain/02-local-dev.md`** — env files and Docker Postgres helper.
