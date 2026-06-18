#!/usr/bin/env bash
# 生产环境变量校验
# 用法：bash deploy/scripts/check-env.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
ROOT=$(pwd)

PASS=0
FAIL=0
WARN=0
NL=$'\n'

ok()   { echo "✓ $1"; PASS=$((PASS+1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL+1)); }
warn() { echo "⚠ $1"; WARN=$((WARN+1)); }

echo "=== 飓风影视 - 环境变量检查 ==="
echo ""

# server/.env
# 安全读 env：避免 cron 表达式中 * 被 shell 展开
read_env() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^"\(.*\)"$/\1/' || true
}

if [ ! -f "server/.env" ]; then
  fail "server/.env 不存在 — 请复制 server/.env.example"
else
  ok "server/.env 存在"
  DATABASE_URL=$(read_env server/.env DATABASE_URL)
  JWT_SECRET=$(read_env server/.env JWT_SECRET)
  NODE_ENV=$(read_env server/.env NODE_ENV)
  CORS_ORIGINS=$(read_env server/.env CORS_ORIGINS)
  MEILI_HOST=$(read_env server/.env MEILI_HOST)
  MEILI_API_KEY=$(read_env server/.env MEILI_API_KEY)
  PROVIDER_FFZY_BACKUP_URLS=$(read_env server/.env PROVIDER_FFZY_BACKUP_URLS)

  # 必填
  [ -n "${DATABASE_URL:-}" ] && ok "DATABASE_URL 已设置" || fail "DATABASE_URL 缺失"
  [ -n "${JWT_SECRET:-}" ] && ok "JWT_SECRET 已设置" || fail "JWT_SECRET 缺失"

  # 安全检查
  if [ "${JWT_SECRET:-}" = "change-me-in-production-must-be-32+-chars" ] \
     || [ "${JWT_SECRET:-}" = "ijfys-dev-secret-change-in-prod" ]; then
    fail "JWT_SECRET 仍为默认值！运行 openssl rand -hex 32 生成"
  elif [ "${#JWT_SECRET}" -lt 32 ]; then
    fail "JWT_SECRET 长度 ${#JWT_SECRET} < 32"
  else
    ok "JWT_SECRET 强度足够（${#JWT_SECRET} 位）"
  fi

  # NODE_ENV
  if [ "${NODE_ENV:-}" = "production" ]; then
    ok "NODE_ENV=production"
  else
    warn "NODE_ENV=${NODE_ENV:-未设置}（生产应为 production）"
  fi

  # CORS
  if [ -n "${CORS_ORIGINS:-}" ]; then
    ok "CORS_ORIGINS=${CORS_ORIGINS}"
  else
    warn "CORS_ORIGINS 未设置（生产将允许所有跨域）"
  fi

  # Meili
  if [ -n "${MEILI_HOST:-}" ]; then
    ok "MEILI_HOST=${MEILI_HOST}"
    if [ -z "${MEILI_API_KEY:-}" ] && [ "${NODE_ENV:-}" = "production" ]; then
      warn "MEILI_API_KEY 未设置（生产建议设置 master key）"
    fi
  else
    warn "MEILI_HOST 未设置（搜索将降级到 trgm）"
  fi

  # Provider backup
  if [ -z "${PROVIDER_FFZY_BACKUP_URLS:-}" ]; then
    warn "PROVIDER_FFZY_BACKUP_URLS 未设置（ffzy 主域名挂掉时无降级）"
  fi
fi

echo ""

# 前端 .env
if [ -f ".env.production" ]; then
  ok ".env.production 存在"
  WEB_API=$(read_env .env.production NEXT_PUBLIC_API_URL)
  WEB_SITE=$(read_env .env.production NEXT_PUBLIC_SITE_URL)
  [ -n "$WEB_API" ] && ok "NEXT_PUBLIC_API_URL=$WEB_API" || fail "NEXT_PUBLIC_API_URL 缺失"
  [ -n "$WEB_SITE" ] && ok "NEXT_PUBLIC_SITE_URL=$WEB_SITE" || fail "NEXT_PUBLIC_SITE_URL 缺失"
  if [ "$WEB_API" = "http://localhost:4000/api" ]; then
    fail "NEXT_PUBLIC_API_URL 仍为 localhost"
  fi
elif [ -f ".env.local" ]; then
  warn "找到 .env.local（仅 dev 用），生产建议使用 .env.production"
else
  fail "前端缺少 .env.production 或 .env.local"
fi

echo ""

# 数据库连通性（去掉 ?schema= 这种 Prisma 私有参数，psql 不识别）
if command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  PG_URL=$(echo "$DATABASE_URL" | sed 's/?schema=[^&]*//' | sed 's/&schema=[^&]*//')
  if psql "$PG_URL" -c "SELECT 1" >/dev/null 2>&1; then
    ok "DATABASE_URL 可连通"
    if psql "$PG_URL" -c "SELECT extname FROM pg_extension WHERE extname='pg_trgm'" 2>/dev/null | grep -q pg_trgm; then
      ok "pg_trgm 扩展已启用"
    else
      fail "pg_trgm 扩展未启用 — 跑 prisma migrate deploy"
    fi
  else
    fail "DATABASE_URL 无法连通"
  fi
else
  warn "跳过 DB 连通性测试（psql 未安装或 DATABASE_URL 缺失）"
fi

# Meili 连通性
if [ -n "${MEILI_HOST:-}" ]; then
  if curl -m 3 -s -o /dev/null "${MEILI_HOST}/health"; then
    ok "Meili 可连通"
  else
    warn "Meili 不可连通（搜索会降级）"
  fi
fi

echo ""
echo "=== 汇总：$PASS PASS / $FAIL FAIL / $WARN WARN ==="
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
