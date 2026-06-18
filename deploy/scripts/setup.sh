#!/usr/bin/env bash
# 一键准备（新机器）：装依赖 + migration + 索引初始化
# 用法：bash deploy/scripts/setup.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
ROOT=$(pwd)
echo "=== ijfys setup @ $ROOT ==="

# 1) 检查环境变量
if [ ! -f "server/.env" ]; then
  echo "[FATAL] server/.env 不存在；请复制 server/.env.example 并配置"; exit 1
fi
if [ ! -f ".env.production" ] && [ ! -f ".env.local" ]; then
  echo "[WARN] 前端无 .env.production；将复制 .env.example 模板"
  cp .env.example .env.production || true
fi

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
  source server/.env
  psql "$DATABASE_URL" -c "SELECT version();" || { echo "[FATAL] DATABASE_URL 不可连"; exit 1; }
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

# 7) Meili index
echo ""
echo "=== Meilisearch 索引初始化 ==="
if curl -m 3 -s http://127.0.0.1:7700/health >/dev/null 2>&1; then
  echo "Meili 已运行，触发 reindex (异步)"
  echo "  执行：curl -X POST http://127.0.0.1:4000/api/admin/search/reindex"
else
  echo "[WARN] Meili 未运行；启动后手动触发 reindex"
fi

echo ""
echo "=== Setup 完成 ==="
echo ""
echo "下一步："
echo "  1) pm2 start deploy/ecosystem.config.js"
echo "  2) sudo cp deploy/nginx/ijfys.conf /etc/nginx/sites-available/"
echo "  3) sudo certbot --nginx -d ijfys.com -d www.ijfys.com"
echo "  4) crontab -e 加入：0 2 * * * $ROOT/deploy/scripts/backup-db.sh"
