#!/bin/sh
set -eu

# Production entrypoint.
#
# Fails fast on missing configuration rather than starting a half-configured
# service, applies pending migrations with a separate migration principal, then
# starts the server.

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${DATABASE_MIGRATION_URL:?DATABASE_MIGRATION_URL is required and must use a separate migration principal}"
: "${APP_URL:?APP_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${SESSION_SECRET:?SESSION_SECRET is required}"
: "${STORAGE_ENCRYPTION_KEY:?STORAGE_ENCRYPTION_KEY is required}"
: "${OUTBOX_ENCRYPTION_KEY:?OUTBOX_ENCRYPTION_KEY is required}"
: "${CRON_SECRET:?CRON_SECRET is required}"
: "${TRUSTED_CLIENT_IP_HEADER:?TRUSTED_CLIENT_IP_HEADER is required behind the trusted ingress}"
: "${SMTP_HOST:?SMTP_HOST is required}"
: "${SMTP_FROM:?SMTP_FROM is required}"
: "${VIRUS_SCAN_DRIVER:?VIRUS_SCAN_DRIVER is required}"

if [ "$VIRUS_SCAN_DRIVER" = "development" ]; then
  echo "VIRUS_SCAN_DRIVER=development is not permitted in production" >&2
  exit 1
fi

# Every secret must be long enough for the primitives that consume it. The
# application throws on a short key at first use; catching it here means the
# container fails to start rather than failing on a user's first request.
for name in JWT_SECRET SESSION_SECRET STORAGE_ENCRYPTION_KEY OUTBOX_ENCRYPTION_KEY; do
  eval "value=\${$name}"
  length=$(printf '%s' "$value" | wc -c)
  if [ "$length" -lt 32 ]; then
    echo "$name must be at least 32 characters (found $length)" >&2
    exit 1
  fi
done

echo "Applying database migrations..."
DATABASE_URL="$DATABASE_MIGRATION_URL" \
  ./node_modules/.bin/prisma migrate deploy --schema prisma/postgresql/schema.prisma

# The Docker image ships Next.js standalone output, which is started directly.
# A non-standalone deployment (or a local production check) still has the full
# tree and its npm scripts.
if [ -f server.js ]; then
  echo "Starting Next.js standalone server..."
  exec node server.js
fi

echo "Starting Next.js server..."
exec npm start
