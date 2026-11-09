#!/bin/sh
# Vercel build: create/update tables, load data + first admin (idempotent), then build the site.
# Migrations and seed use the direct (non-pooled) connection when the hosting provides one
# (Vercel's Neon integration sets DATABASE_URL_UNPOOLED); the running site uses DATABASE_URL.
set -e
MIGRATE_URL="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"
if [ -z "$MIGRATE_URL" ]; then
  echo "ERROR: no database configured. In Vercel: Storage → connect a Neon database to this project, then redeploy." >&2
  exit 1
fi
DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy
DATABASE_URL="$MIGRATE_URL" npx prisma db seed
npx next build
