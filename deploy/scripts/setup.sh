#!/usr/bin/env bash
# 一键准备（新机器）：装依赖 + migration + 索引初始化 + 渲染 nginx 配置
# 用法：bash deploy/scripts/setup.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
ROOT=$(pwd)
PROJECT_NAME="${PROJECT_NAME:-ijfys}"
echo "=== $PROJECT_NAME setup @ $ROOT ==="

# 安全读 env（避免 cron 表达式中 * 被 shell 展开）
read_env() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^"\(.*\)"$/\1/' || true
}

# 1) 检查环境变量
if [ ! -f "server/.env" ]; then
  echo "[FATAL] server/.env 不存在；请复制 server/.env.example 并配置"; exit 1
fi
if [ ! -f ".env.production" ] && [ ! -f ".env.local" ]; then
  echo "[WARN] 前端无 .env.production；将复制 .env.example 模板"
  cp .env.example .env.production || true
fi

SITE_URL=$(read_env .env.production NEXT_PUBLIC_SITE_URL)
SITE_HOST_PRIMARY=$(echo "$SITE_URL" | sed 's|^https\?://||' | sed 's|/$||')
[ -z "$SITE_HOST_PRIMARY" ] && { echo "[FATAL] NEXT_PUBLIC_SITE_URL 未设置"; exit 1; }
SITE_HOST_LIST="${SITE_HOST_PRIMARY} www.${SITE_HOST_PRIMARY}"

echo "  → 主域名：$SITE_HOST_PRIMARY"
echo "  → server_name：$SITE_HOST_LIST"

# 2) 安装依赖
echo ""
echo "=== 安装依赖 ==="
if ! command -v pnpm >/dev/null 2>&1; then
  echo "[FATAL] 未找到 pnpm，请先 npm i -g pnpm"; exit 1
fi
pnpm install --frozen-lockfile
(cd server && pnpm install --frozen-lockfile)

# 3) Postgres 检查
echo ""
echo "=== Postgres 检查 ==="
if ! command -v psql >/dev/null 2>&1; then
  echo "[WARN] psql 未安装；跳过 DB 连接测试"
else
  DB_URL=$(read_env server/.env DATABASE_URL | sed 's/?schema=[^&]*//')
  psql "$DB_URL" -c "SELECT version();" >/dev/null || { echo "[FATAL] DATABASE_URL 不可连"; exit 1; }
  echo "  ✓ DB 可连"
fi

# 4) Prisma migrate
echo ""
echo "=== Prisma migrate deploy ==="
(cd server && ./node_modules/.bin/prisma migrate deploy)
(cd server && ./node_modules/.bin/prisma generate)

# 5) Seed providers
echo ""
echo "=== Seed providers ==="
(cd server && ./node_modules/.bin/ts-node src/cli/seed-providers.ts) || echo "[WARN] seed 失败，可手动 pnpm db:seed"

# 6) 构建前端
echo ""
echo "=== 构建前端 ==="
./node_modules/.bin/next build || echo "[WARN] next build 失败，dev 模式仍可运行"

# 7) 渲染 nginx 配置
echo ""
echo "=== 渲染 nginx 配置 ==="
RENDERED="deploy/nginx/${PROJECT_NAME}.conf"
sed \
  -e "s|__PROJECT__|${PROJECT_NAME}|g" \
  -e "s|__SITE_HOST_PRIMARY__|${SITE_HOST_PRIMARY}|g" \
  -e "s|__SITE_HOST_LIST__|${SITE_HOST_LIST}|g" \
  deploy/nginx/site.conf.template > "$RENDERED"
echo "  ✓ 已生成 $RENDERED"

# 8) Meili index
echo ""
echo "=== Meilisearch 索引初始化 ==="
if curl -m 3 -s http://127.0.0.1:7700/health >/dev/null 2>&1; then
  echo "Meili 已运行，部署后触发 reindex"
  echo "  curl -X POST http://127.0.0.1:4000/api/admin/search/reindex"
else
  echo "[WARN] Meili 未运行；启动后手动触发 reindex"
fi

echo ""
echo "=== Setup 完成 ==="
echo ""
echo "下一步："
echo "  1) pm2 start deploy/ecosystem.config.js"
echo "  2) sudo cp $RENDERED /etc/nginx/sites-available/${PROJECT_NAME}.conf"
echo "  3) sudo ln -sf /etc/nginx/sites-available/${PROJECT_NAME}.conf /etc/nginx/sites-enabled/"
echo "  4) sudo nginx -t && sudo systemctl reload nginx"
echo "  5) sudo certbot --nginx -d ${SITE_HOST_PRIMARY} -d www.${SITE_HOST_PRIMARY}"
echo "  6) crontab -e 加入：0 2 * * * $ROOT/deploy/scripts/backup-db.sh"
