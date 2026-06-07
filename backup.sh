#!/bin/bash
# Backup Script for Garuda Nexa Bahtera
# Author: Hermes Agent

PROJECT_DIR="/mnt/projects/linux-projects/garudanexabahtera"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DB_CONTAINER="garudanexabahtera-mysql"

echo "[$DATE] Starting backup..."

# 1. DB Dump
docker exec $DB_CONTAINER mysqldump -u root -pgaruda2024 db_garudanexabahtera > $BACKUP_DIR/db_backup_$DATE.sql 2>/dev/null
echo "DB dump saved to $BACKUP_DIR/db_backup_$DATE.sql"

# 2. Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete 2>/dev/null

# 3. Git auto-commit
cd $PROJECT_DIR
git add .
git commit -m "chore: automatic backup $DATE" 2>/dev/null

echo "[$DATE] Backup complete."