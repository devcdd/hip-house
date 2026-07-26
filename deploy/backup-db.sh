#!/usr/bin/env bash
# Dump the hiphouse Postgres DB to a timestamped .sql.gz and prune old backups.
# Meant to be run from cron (see deploy/README or the crontab example below).
#
#   0 4 */2 * *  /root/hiphouse/deploy/backup-db.sh >> /var/log/hiphouse-backup.log 2>&1
#
# Restore:  gunzip -c backups/hiphouse-YYYYmmdd-HHMMSS.sql.gz \
#             | docker exec -i hiphouse-db psql -U hiphouse -d hiphouse
set -euo pipefail

# --- config (override via env or edit here) ---
DEPLOY_PATH="${DEPLOY_PATH:-/root/hiphouse}"
BACKUP_DIR="${BACKUP_DIR:-$DEPLOY_PATH/backups}"
DB_CONTAINER="${DB_CONTAINER:-hiphouse-db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Pull DB creds from the deploy .env if present (falls back to compose defaults).
if [[ -f "$DEPLOY_PATH/.env" ]]; then
  # shellcheck disable=SC1091
  set -a; . "$DEPLOY_PATH/.env"; set +a
fi
DB_USER="${POSTGRES_USER:-hiphouse}"
DB_NAME="${POSTGRES_DB:-hiphouse}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/hiphouse-$STAMP.sql.gz"

# --custom would be smaller/faster to restore, but plain SQL is the most portable.
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip -9 > "$FILE"

# Guard against a truncated/empty dump slipping through.
if [[ ! -s "$FILE" ]]; then
  echo "$(date -Iseconds) ERROR: backup is empty, removing $FILE" >&2
  rm -f "$FILE"
  exit 1
fi

# Prune backups older than RETENTION_DAYS.
find "$BACKUP_DIR" -name 'hiphouse-*.sql.gz' -type f -mtime "+$RETENTION_DAYS" -delete

echo "$(date -Iseconds) OK: $(du -h "$FILE" | cut -f1) -> $FILE"
