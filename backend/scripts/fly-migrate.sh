#!/bin/sh
# Fly release_command. Cwd do release NÃO é garantido como /app — usa caminhos absolutos.
set -eu
cd /app
echo "fly-migrate: start cwd=$(pwd)"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "fly-migrate: DATABASE_URL ausente" >&2
  exit 1
fi
export DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed 's/-pooler//')"
echo "fly-migrate: prisma migrate deploy"
exec /app/node_modules/.bin/prisma migrate deploy
