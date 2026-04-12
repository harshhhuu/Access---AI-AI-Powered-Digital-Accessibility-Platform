#!/usr/bin/env bash
# Start local Postgres (Docker), sign-inference (9001), Node API (8001), Vite frontend — all on the host.
#
# Alternative (Phase 9): API + sign + Postgres in Docker, Vite on host:
#   pnpm dev:docker
#   (see deploy/README.md)
#
# Usage: bash scripts/dev-all.sh
# Prerequisites: Docker (optional), pnpm, services/sign-inference/.venv — see brain/02-local-dev.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${1:-}" == "--docker" ]]; then
  exec bash "$ROOT/scripts/dev-docker-stack.sh"
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker compose up -d
else
  echo "Note: Docker not running or not installed — skipping \`docker compose up -d\`. Ensure PostgreSQL matches DATABASE_URL in server/.env."
fi

PY="$ROOT/services/sign-inference/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  echo "Missing Python venv: $PY" >&2
  echo "Run: cd services/sign-inference && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" >&2
  exit 1
fi

if [[ ! -d "$ROOT/server/node_modules" ]]; then
  echo "Installing server dependencies..." >&2
  pnpm --dir "$ROOT/server" install
fi

if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "Installing frontend dependencies..." >&2
  pnpm --dir "$ROOT/frontend" install
fi

if [[ ! -d "$ROOT/node_modules" ]]; then
  echo "Installing root dev dependencies (concurrently)..." >&2
  pnpm install
fi

exec pnpm exec concurrently \
  -k \
  -n sign,api,web \
  -c magenta,green,cyan \
  "cd \"$ROOT/services/sign-inference\" && PYTHONPATH=. \"$PY\" -m uvicorn app.main:app --host 127.0.0.1 --port 9001" \
  "pnpm --dir \"$ROOT/server\" dev" \
  "pnpm --dir \"$ROOT/frontend\" dev"
