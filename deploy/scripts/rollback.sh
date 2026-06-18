#!/usr/bin/env bash
# 飓风影视 - 一键回滚工具
# 用法：bash deploy/scripts/rollback.sh <scenario> [args...]
#   code <tag>                  代码回滚（git checkout + reload）
#   db <backup-file>            数据库恢复
#   meili                       清 Meili 索引并重建
#   full <tag> <backup-file>    完整回滚
#   maintenance on|off          进/出维护模式

set -euo pipefail
cd "$(dirname "$0")/../.."
ROOT=$(pwd)
SCENARIO="${1:-}"
shift || true

bail() { echo "✗ $1" >&2; exit 1; }

case "$SCENARIO" in
  code)
    TAG="${1:-}"
    [ -z "$TAG" ] && bail "用法: rollback.sh code <git-tag>"
    echo "→ 标记当前状态"
    git tag "rollback-from-$(git rev-parse --short HEAD)-$(date +%s)" HEAD || true
    echo "→ 切换到 $TAG"
    git fetch --tags
    git checkout "$TAG"
    echo "→ 重装依赖"
    pnpm install --frozen-lockfile
    (cd server && pnpm install --frozen-lockfile && ./node_modules/.bin/prisma generate)
    echo "→ 重载 PM2"
    pm2 reload ijfys-api
    pm2 reload ijfys-web
    echo "→ 健康检查"
    sleep 5
    bash deploy/scripts/health-check.sh
    echo "✓ 代码回滚完成"
    ;;

  db)
    BACKUP="${1:-}"
    [ -z "$BACKUP" ] && bail "用法: rollback.sh db <backup.sql.gz>"
    [ ! -f "$BACKUP" ] && bail "备份文件不存在: $BACKUP"

    # 读 DATABASE_URL
    PG_URL=$(grep -E "^DATABASE_URL=" server/.env | tail -1 | cut -d= -f2- | sed 's/^"\(.*\)"$/\1/' | sed 's/?schema=[^&]*//')
    [ -z "$PG_URL" ] && bail "DATABASE_URL 读取失败"

    echo "→ 停服"
    pm2 stop ijfys-api ijfys-web || true

    echo "→ 备份当前状态"
    SAFE_BACKUP="/tmp/pre-rollback-$(date +%s).sql.gz"
    pg_dump "$PG_URL" --no-owner | gzip > "$SAFE_BACKUP"
    echo "  保存到 $SAFE_BACKUP"

    echo "→ 恢复 $BACKUP"
    gunzip < "$BACKUP" | psql "$PG_URL"

    echo "→ 重启"
    pm2 start ijfys-api ijfys-web

    echo "→ 触发 Meili 重建（库与索引可能不一致）"
    sleep 8
    curl -sf -X POST http://127.0.0.1:4000/api/admin/search/reindex >/dev/null || echo "  (后台异步执行)"

    sleep 3
    bash deploy/scripts/health-check.sh
    echo "✓ 数据库恢复完成（回滚前的状态已存 $SAFE_BACKUP）"
    ;;

  meili)
    echo "→ 停 Meili"
    pm2 stop meilisearch
    echo "→ 清索引"
    rm -rf /var/lib/meili/db/*
    echo "→ 重启 Meili"
    pm2 start meilisearch
    echo "→ 等待 Meili ready"
    until curl -m 2 -s -o /dev/null http://127.0.0.1:7700/health; do sleep 1; done
    echo "→ 触发重建"
    curl -sf -X POST http://127.0.0.1:4000/api/admin/search/reindex
    echo "✓ Meili 索引重建已启动（异步），可用 /api/admin/search/stats 监控"
    ;;

  full)
    TAG="${1:-}"
    BACKUP="${2:-}"
    [ -z "$TAG" ] || [ -z "$BACKUP" ] && bail "用法: rollback.sh full <git-tag> <backup.sql.gz>"
    echo "=== 完整回滚：tag=$TAG, db=$BACKUP ==="
    bash "$0" maintenance on
    bash "$0" code "$TAG"
    bash "$0" db "$BACKUP"
    bash "$0" meili
    bash "$0" maintenance off
    echo "✓ 完整回滚完成"
    ;;

  maintenance)
    MODE="${1:-}"
    if [ "$MODE" = "on" ]; then
      sudo tee /etc/nginx/sites-enabled/maintenance.conf >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    ssl_certificate /etc/letsencrypt/live/ijfys.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ijfys.com/privkey.pem;
    return 503 'Site is under maintenance, back in 10 minutes.';
}
EOF
      sudo systemctl reload nginx
      echo "✓ 维护模式 ON"
    elif [ "$MODE" = "off" ]; then
      sudo rm -f /etc/nginx/sites-enabled/maintenance.conf
      sudo systemctl reload nginx
      echo "✓ 维护模式 OFF"
    else
      bail "用法: rollback.sh maintenance on|off"
    fi
    ;;

  *)
    cat <<EOF
飓风影视 - 一键回滚工具

用法：
  bash deploy/scripts/rollback.sh code <git-tag>
  bash deploy/scripts/rollback.sh db <backup-file>
  bash deploy/scripts/rollback.sh meili
  bash deploy/scripts/rollback.sh full <git-tag> <backup-file>
  bash deploy/scripts/rollback.sh maintenance on|off

详见 ROLLBACK.md
EOF
    exit 1
    ;;
esac
