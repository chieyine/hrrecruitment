#!/bin/sh
set -eu

backup_dir=${1:-./backups}
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
output="$backup_dir/frad-recruitment-$stamp.dump"

PGDATABASE="$DATABASE_URL" pg_dump --format=custom --no-owner --no-acl --file="$output"
sha256sum "$output" > "$output.sha256"
chmod 600 "$output" "$output.sha256"
echo "Backup created: $output"
