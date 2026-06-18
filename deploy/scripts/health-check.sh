#!/usr/bin/env bash
# 部署后健康检查脚本
# 用法：bash deploy/scripts/health-check.sh [host]
set -e
HOST="${1:-http://localhost:4000}"
WEB="${2:-http://localhost:3000}"

echo "=== API health ==="
curl -sf "$HOST/api/health" | head -c 200; echo ""

echo "=== Readiness (DB + Meili) ==="
curl -sf "$HOST/api/ready" | head -c 400; echo ""

echo "=== sitemap.xml ==="
curl -sfI "$WEB/sitemap.xml" | head -2

echo "=== robots.txt ==="
curl -sfI "$WEB/robots.txt" | head -2

echo "=== rss.xml ==="
curl -sfI "$WEB/rss.xml" | head -2

echo "=== /api/home/configured ==="
curl -sf "$HOST/api/home/configured" -o /dev/null -w "→ %{http_code}\n"

echo "=== /api/search?q=三体 ==="
curl -sf "$HOST/api/search?q=$(printf '%s' 三体 | jq -sRr @uri)" -o /dev/null -w "→ %{http_code}\n"

echo "=== Meili stats ==="
curl -sf "$HOST/api/admin/search/stats" | head -c 200; echo ""

echo ""
echo "✅ 所有端点 OK"
