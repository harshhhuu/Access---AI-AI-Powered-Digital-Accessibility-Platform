#!/usr/bin/env bash
# Phase 9: run Postgres + sign-inference + Node API in Docker, Vite on the host.
# API: http://localhost:8001 — set frontend/.env: VITE_API_BASE_URL and VITE_WS_URL to match.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for this script." >&2
  exit 1
fi

echo "Building and starting full stack (profile: fullstack)..." >&2
docker compose --profile fullstack up -d --build

echo "Waiting for Postgres..." >&2
until docker compose exec -T db pg_isready -U postgres -d accessai >/dev/null 2>&1; do
  sleep 1
done

echo "" >&2
echo "  API (Node):  http://localhost:8001/health" >&2
echo "  Sign (internal only): http://sign:9001 inside compose" >&2
echo "  Starting Vite — ensure frontend/.env uses http://localhost:8001 and ws://localhost:8001" >&2
echo "" >&2

if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "Installing frontend dependencies..." >&2
  pnpm --dir "$ROOT/frontend" install
fi

if [[ ! -d "$ROOT/node_modules" ]]; then
  pnpm install
fi

exec pnpm --dir "$ROOT/frontend" dev
