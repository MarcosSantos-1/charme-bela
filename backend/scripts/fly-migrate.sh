#!/bin/sh
# Fly release_command: aplica migrations com conexão DIRETA do Neon.
# O host *-pooler quebra o advisory lock do Prisma (exit 1, logs somem).
set -eu
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL ausente no release command" >&2
  exit 1
fi
export DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed 's/-pooler//')"
echo "prisma migrate deploy (direct Neon host)"
exec ./node_modules/.bin/prisma migrate deploy
