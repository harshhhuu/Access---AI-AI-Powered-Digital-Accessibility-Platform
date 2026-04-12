# Project overview

**AccessAI** is an AI-powered accessibility platform: vision, speech, and language features to help people with disabilities use the web more easily.

## Repository layout

| Path | Role |
| --- | --- |
| `backend/` | FastAPI + PostgreSQL API and services |
| `frontend/` | React web app |
| `extension/` | Browser extension |
| `docs/` | Images and supplementary docs |
| `brain/` | This knowledge base (indexed notes, changelog) |

## Tech stack (high level)

- **Backend:** Python 3.11, FastAPI, PostgreSQL
- **Frontend:** React (see `frontend/package.json` for versions)
- **AI / media:** CV, speech, and NLP pipelines as described in the root `README.md`

## Notes

- Keep operational secrets out of `brain/`; use env vars and secure storage only.
