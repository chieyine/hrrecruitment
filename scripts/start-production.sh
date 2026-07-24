#!/bin/sh
set -eu

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

DATABASE_URL="$DATABASE_MIGRATION_URL" npm run db:postgres:deploy
exec npm start
