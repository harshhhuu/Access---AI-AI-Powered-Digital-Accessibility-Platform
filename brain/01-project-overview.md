# Project overview

**AccessAI** is an AI-powered accessibility platform: vision, speech, and language features to help people with disabilities use the web more easily.

## Repository layout

| Path | Role |
| --- | --- |
| `server/` | **Primary HTTP API** — Fastify + Prisma + TypeScript, PostgreSQL |
| `services/sign-inference/` | Python microservice — TensorFlow sign prediction (`POST /predict`); called only by Node (`SIGN_SERVICE_URL`) |
| `frontend/` | React web app |
| `extension/` | Browser extension |
| `docs/` | Images and supplementary docs |
| `brain/` | This knowledge base (indexed notes, changelog) |

## Tech stack (high level)

- **API:** Node.js (Fastify + Prisma), PostgreSQL
- **Sign ML (server-side):** Python 3.11 + TensorFlow in `services/sign-inference/` (not exposed to browsers directly)
- **Frontend:** React (see `frontend/package.json` for versions)
- **AI / media:** CV, speech, and NLP pipelines as described in the root `README.md`

## Notes

- Keep operational secrets out of `brain/`; use env vars and secure storage only.
