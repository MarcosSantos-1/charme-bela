#!/bin/sh
# Fly release_command. Cwd do release NÃO é garantido como /app — usa caminhos absolutos.
set -eu
cd /app
echo "fly-migrate: start cwd=$(pwd)"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "fly-migrate: DATABASE_URL ausente" >&2
  exit 1
fi

# Host direto: PgBouncer (*-pooler) não segura pg_advisory_lock do Prisma.
export DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed 's/-pooler//')"
case "$DATABASE_URL" in
  *connect_timeout=*) ;;
  *)
    if printf '%s' "$DATABASE_URL" | grep -q '?'; then
      DATABASE_URL="${DATABASE_URL}&connect_timeout=60"
    else
      DATABASE_URL="${DATABASE_URL}?connect_timeout=60"
    fi
    export DATABASE_URL
    ;;
esac

# Fly só roda um release por vez. O lock de 10s do Prisma falha no cold start do Neon.
export PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1

PRISMA=/app/node_modules/.bin/prisma
SCHEMA=/app/prisma/schema.prisma

echo "fly-migrate: warming Neon"
i=1
while [ "$i" -le 8 ]; do
  if echo 'SELECT 1;' | "$PRISMA" db execute --schema "$SCHEMA" --stdin; then
    echo "fly-migrate: database reachable (attempt $i)"
    break
  fi
  echo "fly-migrate: warmup $i failed, retrying..."
  i=$((i + 1))
  sleep 3
done

echo "fly-migrate: prisma migrate deploy"
i=1
while [ "$i" -le 5 ]; do
  if "$PRISMA" migrate deploy --schema "$SCHEMA"; then
    echo "fly-migrate: done"
    exit 0
  fi
  echo "fly-migrate: deploy attempt $i failed, retrying..."
  i=$((i + 1))
  sleep 4
done

echo "fly-migrate: prisma migrate deploy failed after retries" >&2
exit 1
