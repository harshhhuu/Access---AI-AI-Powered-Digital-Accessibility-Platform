# Brain changelog

Versioned record of knowledge-base and process changes. Newest first.

## [brain-0.1.23] — 2026-04-12

- **Git history:** Removed `server/.env`, `frontend/.env`, and historical `backend/.env` from all commits (`git filter-repo --invert-paths`). Restored **`server/.env.example`** and **`frontend/.env.example`** (keys only); real `.env` files are gitignored. Documented in `brain/02-local-dev.md`. After pulling, run `git fetch` and reset to the rewritten branch, or re-clone.

## [brain-0.1.21] — 2026-04-12

- Sign Call remote video: mount in-call UI as soon as the outgoing user dials; split **remote audio** into a hidden `<audio>` and **mute** the remote `<video>` so autoplay is not blocked; add **TURN** (OpenRelay) + STUN ICE servers; **`track`** fallback on `RTCPeerConnection`; dial timeout uses **remoteStreamReceived**; incoming call **answer** after `setCallActive` so the remote video node exists (`VideoCall.jsx`).

## [brain-0.1.20] — 2026-04-12

- Sign Call: fixed missing **remote video** for the **outgoing caller** — the remote `MediaStream` could arrive before the in-call `<video>` mounted, so `attachRemoteStream` bailed with a null ref; pending stream + callback ref on the remote video (`VideoCall.jsx`).

## [brain-0.1.19] — 2026-04-12

- Frontend TTS: `frontend/src/lib/browserTts.js` — `speechSynthesis.resume()`, Safari `voiceschanged`, and `getVoices()` priming so Read Aloud / voice “read page” work across WebKit and Chrome. `AccessibilityContext.speak` and sign `speakText` use it. Voice nav: natural phrases (`read the page`, …), longest-keyword match, word-boundary single tokens, removed bare `back` keyword to avoid false matches.

## [brain-0.1.18] — 2026-04-12

- Phase 10 decommission: removed the FastAPI **`backend/`** monolith; **`services/sign-inference/`** is the only Python service. Updated **`brain/01-project-overview.md`**, **`brain/02-local-dev.md`**, **`brain/04-features-and-stack.md`**, **`brain/03-backend-python-to-node-migration.md`**, **`brain/05-node-migration-phased-plan.md`**, root **`README.md`**, **`frontend/README.md`**, **`deploy/README.md`**, **`server/README.md`**, **`server/.env`** header; server comments no longer reference removed paths.

## [brain-0.1.17] — 2026-04-12

- Phase 9 deployment: Docker Compose profile `fullstack` (Postgres + internal sign-inference + Node API on 8001), `server/Dockerfile` + `docker-entrypoint.sh` (Prisma migrate deploy); `deploy/README.md`; `pnpm dev:docker` and `dev-all.sh --docker`; frontend API/WS defaults → Node 8001. Updated `05-node-migration-phased-plan.md`, `02-local-dev.md`, `README.md`, `server/README.md`.

## [brain-0.1.16] — 2026-04-12

- Root `pnpm dev` + `scripts/dev-all.sh`: starts Docker Postgres (if available), sign-inference (9001), Node API (`server`), Vite (`frontend`) via `concurrently`; root `package.json` + `node_modules/` gitignored. Documented in `02-local-dev.md`.

## [brain-0.1.15] — 2026-04-12

- Phase 8 parity/testing/observability: Vitest contract + sign golden/failure tests; `buildApp({ skipDatabaseHooks })`; request id + `x-request-id` response header; structured `upstream`/`upstreamMs` logs; optional k6 simplify smoke (`server/load/`). Updated `05-node-migration-phased-plan.md`, `server/README.md`.

## [brain-0.1.14] — 2026-04-12

- Phase 7 sign on Node: `POST /api/sign/predict` (proxy to Python `SIGN_SERVICE_URL`, `SignLog` on success), `GET /ws/sign` (per-message proxy, no DB log); `server/.env` adds `SIGN_SERVICE_URL`; `frontend/.env` sets `VITE_WS_URL=ws://localhost:8001` for Node WS. Updated `05-node-migration-phased-plan.md`, `server/README.md`, `02-local-dev.md`.

## [brain-0.1.13] — 2026-04-12

- Phase 6 voice on Node: `POST /api/voice` (multipart `audio`), `hf-voice.ts` (Whisper on HF Router + 503 retry), `api_cache` key `voice:` + bytes; global multipart **25 MB**. Updated `05-node-migration-phased-plan.md`, `server/README.md`.

## [brain-0.1.12] — 2026-04-12

- Phase 5 image describe on Node: `POST /api/describe`, `POST /api/describe/url` (multipart, sharp fallback, HF vision + 503 retry); `HF_VISION_MODEL` in `server/.env`. Updated `05-node-migration-phased-plan.md`, `server/README.md`.

## [brain-0.1.11] — 2026-04-12

- Removed `frontend/.env.example`, `server/.env.example`, and `services/sign-inference/.env.example`; docs now reference tracked `.env` files and `.env.local` overrides.

## [brain-0.1.10] — 2026-04-12

- Version `backend/.env`, `server/.env`, and `frontend/.env`; stop gitignoring package `.env` files; ignore `**/.env.local` only; CORS adds `localhost:5174`. Phase 4 simplify routes committed with HF helpers.

## [brain-0.1.9] — 2026-04-12

- Phase 4 cognitive simplifier on Node: `POST /api/simplify` with Prisma `api_cache`, SHA-256 key parity, Hugging Face chat completions + 503 retry (`server/src/routes/simplify.ts`, `hf-simplify.ts`). Updated `server/.env.example`, `server/README.md`, `05-node-migration-phased-plan.md`.

## [brain-0.1.8] — 2026-04-12

- Phase 3 auth on Node: `POST/GET/PUT /auth/*` in `server/` (bcrypt, JWT HS256, FastAPI-shaped `detail` errors). Updated `server/README.md`, `server/.env.example`, `05-node-migration-phased-plan.md`.

## [brain-0.1.7] — 2026-04-12

- Phase 2 Node shell: added `server/` (Fastify, Prisma, `GET /health`, CORS, initial SQL migration `20260412120000_init`). Updated `02-local-dev.md`, `01-project-overview.md`, `05-node-migration-phased-plan.md`, and index link to `server/README.md`.

## [brain-0.1.6] — 2026-04-12

- Stop ignoring `frontend/.env` in root and `frontend/.gitignore` so default Vite API/WebSocket URLs can be versioned (same values as `.env.example`; `backend/.env` and `.env.local` remain ignored).

## [brain-0.1.4] — 2026-04-12

- Implemented Phase 1 sign-inference microservice (`services/sign-inference/`): FastAPI `POST /predict`, `GET /health`, Dockerfile, README; documented run and dummy-model smoke test in `02-local-dev.md`; marked Phase 1 complete in `05-node-migration-phased-plan.md`. Root `.gitignore` ignores `services/sign-inference/.venv/` and `models/*.h5`.

## [brain-0.1.3] — 2026-04-12

- Added phased implementation plan for full backend migration with a dedicated Python sign-inference service (`05-node-migration-phased-plan.md`); indexed `04-features-and-stack` and the new plan in `00-index.md`.

## [brain-0.1.2] — 2026-04-12

- Added Python → Node backend migration checklist (`03-backend-python-to-node-migration.md`) and linked it from the brain index.

## [brain-0.1.5] — 2026-04-12

- Added `04-features-and-stack.md`: feature walkthrough and technology stack (frontend, backend, HF, DB, extension).

## [brain-0.1.4] — 2026-04-12

- MediaPipe Hands: session singleton (`src/lib/mediapipeHandsClient.js`) so WASM loads once — fixes Emscripten `Module.arguments` / `arguments_` abort under React Strict Mode; hook no longer calls `hands.close()` on unmount.

## [brain-0.1.3] — 2026-04-12

- Sign-language hook: static `@mediapipe/hands` import, version-pinned `locateFile` CDN URLs, Strict Mode–safe cleanup (`hands.close()`), clearer error text; Vite `optimizeDeps` includes MediaPipe + TF.js.

## [brain-0.1.2] — 2026-04-12

- Noted optional `docker compose` for local Postgres (`02-local-dev.md`); added root `docker-compose.yml` for Postgres on port 5433.

## [brain-0.1.1] — 2026-04-12

- Documented local env layout and run commands (`02-local-dev.md`); expanded root `.gitignore` for `frontend/.env` and generic `.env` files.

## [brain-0.1.0] — 2026-04-12

- Initialized `brain/` with numbered index (`00-index.md`), project overview (`01-project-overview.md`), and this changelog.
