#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: CONFIRM_FRAD_RESTORE=yes $0 /path/to/backup.dump" >&2
  exit 2
fi
if [ "${CONFIRM_FRAD_RESTORE:-}" != "yes" ]; then
  echo "Restore refused. Set CONFIRM_FRAD_RESTORE=yes after verifying the target database." >&2
  exit 3
fi

backup_file=$1
test -f "$backup_file"
test -f "$backup_file.sha256"
expected_checksum=$(sed -n '1{s/[[:space:]].*$//;p;}' "$backup_file.sha256")
actual_checksum=$(sha256sum "$backup_file" | sed 's/[[:space:]].*$//')
if [ -z "$expected_checksum" ] || [ "$expected_checksum" != "$actual_checksum" ]; then
  echo "Restore refused: checksum does not match the selected archive." >&2
  exit 4
fi
PGDATABASE="$DATABASE_URL" pg_restore --list "$backup_file" >/dev/null

PGDATABASE="$DATABASE_URL" pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error \
  --single-transaction \
  "$backup_file"
echo "Restore completed. Run smoke tests before reopening traffic."
