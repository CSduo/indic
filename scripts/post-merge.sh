#!/bin/bash
set -e

pnpm install --frozen-lockfile

if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL found — running database migration..."
  pnpm --filter db push
else
  echo "⚠️  DATABASE_URL not set — skipping database migration."
  echo "   Set DATABASE_URL and run 'pnpm --filter db push' manually when ready."
fi
