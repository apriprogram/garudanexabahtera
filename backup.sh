#!/bin/bash
# Backup Script for Garuda Nexa Bahtera
# Author: Hermes Agent
#
# Dumps the MySQL database into backups/. The dumps contain production data, so
# backups/ is gitignored and this script never touches git. It is not part of
# `npm run build`; run it on the VPS with `npm run backup` or from cron, e.g.:
#   0 2 * * * /mnt/projects/linux-projects/garudanexabahtera/backup.sh >> /var/log/garudanexa-backup.log 2>&1
#
# The DB password is read from MYSQL_ROOT_PASSWORD (environment or .env next to
# this script) and handed to mysqldump via MYSQL_PWD, never on the command line.

set -euo pipefail
umask 077 # dumps are readable by the owner only

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DB_CONTAINER="${DB_CONTAINER:-garudanexabahtera-mysql}"

# Print the value of KEY from .env without executing the file
env_from_file() {
  [ -f "$PROJECT_DIR/.env" ] || return 0
  { grep -E "^$1=" "$PROJECT_DIR/.env" || true; } | tail -n 1 | cut -d= -f2- | tr -d '\r' \
    | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-$(env_from_file MYSQL_ROOT_PASSWORD)}"
MYSQL_DB="${MYSQL_DB:-$(env_from_file MYSQL_DB)}"
MYSQL_DB="${MYSQL_DB:-db_garudanexabahtera}"

if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  echo "MYSQL_ROOT_PASSWORD is not set (add it to $PROJECT_DIR/.env, see .env.example)" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/db_backup_$DATE.sql"

echo "[$DATE] Starting backup..."

# 1. DB Dump (`-e MYSQL_PWD` without a value passes this shell's MYSQL_PWD into the container)
if ! MYSQL_PWD="$MYSQL_ROOT_PASSWORD" docker exec -e MYSQL_PWD "$DB_CONTAINER" \
    mysqldump -u root "$MYSQL_DB" > "$OUT.tmp"; then
  rm -f "$OUT.tmp"
  echo "[$DATE] Backup FAILED" >&2
  exit 1
fi
mv "$OUT.tmp" "$OUT"
echo "DB dump saved to $OUT"

# 2. Cleanup old backups (keep 7 days)
find "$BACKUP_DIR" -name "db_backup_*.sql" -mtime +7 -delete

echo "[$DATE] Backup complete."
