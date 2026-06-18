#!/usr/bin/env bash
# 数据库备份脚本
# 配置 crontab: 0 2 * * * /opt/ijfys/deploy/scripts/backup-db.sh
#
# 输出 7 天滚动备份 + 30 天月备份
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ijfys}"
DB_URL="${DATABASE_URL:-postgresql://ijfys:ijfys@localhost:5432/ijfys}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
MONTHLY_RETENTION_DAYS="${MONTHLY_RETENTION_DAYS:-90}"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/monthly"

DATE=$(date +%Y%m%d-%H%M%S)
DAILY_FILE="$BACKUP_DIR/daily/ijfys-$DATE.sql.gz"

echo "[$(date)] dumping to $DAILY_FILE..."
pg_dump "$DB_URL" --no-owner --no-privileges --clean --if-exists | gzip > "$DAILY_FILE"
SIZE=$(du -h "$DAILY_FILE" | cut -f1)
echo "[$(date)] daily backup ok, size=$SIZE"

# 每月 1 号额外保留到 monthly/
if [ "$(date +%d)" = "01" ]; then
  cp "$DAILY_FILE" "$BACKUP_DIR/monthly/ijfys-$(date +%Y%m).sql.gz"
  echo "[$(date)] monthly snapshot saved"
fi

# 清理 N 天前的 daily / 90 天前的 monthly
find "$BACKUP_DIR/daily" -type f -name "*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR/monthly" -type f -name "*.sql.gz" -mtime "+$MONTHLY_RETENTION_DAYS" -delete

echo "[$(date)] retention done"
