#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
STOREFRONT_DIR="$ROOT_DIR/apps/storefront"

if [ ! -f "$BACKEND_DIR/.env" ]; then
  printf 'Missing apps/backend/.env. Create it from .env.example and set DATABASE_URL.\n' >&2
  exit 1
fi

if [ ! -f "$STOREFRONT_DIR/.env.local" ]; then
  printf 'Missing apps/storefront/.env.local. Create it from .env.example.\n' >&2
  exit 1
fi

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "${STOREFRONT_PID:-}" ]; then kill "$STOREFRONT_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

printf 'Building Gelato client...\n'
npm run build:gelato-client --prefix "$ROOT_DIR"

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  printf 'Running backend migrations against configured DATABASE_URL...\n'
  (cd "$BACKEND_DIR" && npx medusa db:migrate)
fi

if [ "${SKIP_SEED:-false}" != "true" ]; then
  printf 'Running MVP seed...\n'
  (cd "$BACKEND_DIR" && npm run seed:mvp)
fi

printf 'Starting backend on http://localhost:9000...\n'
(cd "$BACKEND_DIR" && GELATO_MOCK="${GELATO_MOCK:-true}" npm run dev) &
BACKEND_PID=$!

printf 'Starting storefront on http://localhost:8000/es...\n'
(cd "$STOREFRONT_DIR" && npm run dev) &
STOREFRONT_PID=$!

wait -n "$BACKEND_PID" "$STOREFRONT_PID"
