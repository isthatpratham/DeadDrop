#!/bin/sh
set -e

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
SQLITE_PATH="${SQLITE_PATH:-/app/backend/database/deaddrop.db}"
DATABASE_DIR="$(dirname "$SQLITE_PATH")"

mkdir -p "$UPLOAD_DIR" "$DATABASE_DIR"
chown -R node:node "$UPLOAD_DIR" "$DATABASE_DIR"

exec gosu node "$@"
