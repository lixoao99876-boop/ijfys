# 飓风影视 - 回滚手册

适用于上线后出现的各类问题。**所有命令在 VPS 上以 `ijfys` 用户执行**（数据库恢复需 postgres 用户）。

---

## 紧急级别

| 级别 | 现象 | 处理时间 | 默认操作 |
|---|---|---|---|
| **P0** | 全站 502 / DB 不可用 / 数据被误删 | 5 min | 立刻回滚（场景 D） |
| **P1** | 主功能异常 / 影响登录或播放 | 15 min | 单服务重启 → 代码回滚（场景 A/B） |
| **P2** | 局部 bug / 后台异常 / 慢查询 | 1 h | 排查日志后定向修复 |
| **P3** | 性能或体验问题 | 1 d | 计入下次发版 |

---

## 场景 A：仅代码出问题（推荐先尝试）

适用：登录/搜索/播放某个功能出现回归。**数据库 schema 未变**。

```bash
cd /opt/ijfys

# 1. 标记当前状态便于二次回滚回此版本
git tag rollback-$(date +%Y%m%d-%H%M%S) HEAD

# 2. 切到上一个稳定 tag
git fetch --tags
git log --oneline -20                       # 找上一个 stable
git checkout v1.0.0-beta                    # 或其他 tag

# 3. 重装依赖（如 package.json 变了）
pnpm install --frozen-lockfile
(cd server && pnpm install --frozen-lockfile)
(cd server && ./node_modules/.bin/prisma generate)

# 4. 前端重新构建（如有 next build 模式）
./node_modules/.bin/next build || true

# 5. 重启
pm2 reload ijfys-api
pm2 reload ijfys-web

# 6. 验证
bash deploy/scripts/health-check.sh
```

---

## 场景 B：单服务故障（最轻）

某一个 PM2 进程异常，但其他正常：

```bash
pm2 logs ijfys-api --lines 100        # 看日志
pm2 reload ijfys-api                  # 零停机重载
# 或
pm2 restart ijfys-api                 # 完全重启
pm2 stop ijfys-api && pm2 start ijfys-api  # 强制重新装载
```

PM2 自身故障：

```bash
pm2 resurrect                         # 从 dump.pm2 恢复
# 或彻底重新拉起
pm2 kill
pm2 start /opt/ijfys/deploy/ecosystem.config.js
pm2 save
```

---

## 场景 C：数据库 migration 需要回滚

适用：Prisma migrate dev/deploy 应用了一个有问题的 migration。

```bash
cd /opt/ijfys/server

# 1. 看当前状态
./node_modules/.bin/prisma migrate status

# 2. 标记该 migration 为 rolled-back（Prisma 不会自动反向执行 SQL）
./node_modules/.bin/prisma migrate resolve \
  --rolled-back 20260618143000_enable_pg_trgm

# 3. 手动反向 SQL（Prisma 不生成 down migration，需手写）
#    例如：DROP COLUMN / DROP INDEX 等
psql "$DATABASE_URL" <<EOF
-- 例：要撤销添加的字段
-- ALTER TABLE videos DROP COLUMN status;
EOF

# 4. 重新拉以前的 schema（如代码也回滚）
git checkout <prev-tag> -- prisma/schema.prisma server/prisma/migrations/

# 5. 重启 API
pm2 reload ijfys-api
```

如果回滚导致数据丢失风险，跳到场景 D 用备份恢复。

---

## 场景 D：从数据库备份恢复（P0 大事故）

适用：数据被批量误删 / migration 摧毁了数据 / 库被覆写。

```bash
# 1. 立即停服
pm2 stop ijfys-api ijfys-web

# 2. 备份当前状态（万一恢复的备份本身有问题）
pg_dump "$DATABASE_URL" --no-owner | gzip > /tmp/pre-rollback-$(date +%s).sql.gz

# 3. 列可用备份
ls -lh /var/backups/ijfys/daily/
ls -lh /var/backups/ijfys/monthly/

# 4. 选个时间点恢复（PG_URL 去掉 ?schema= 参数）
PG_URL="postgresql://ijfys:STRONG_PASSWORD@localhost:5432/ijfys"
gunzip < /var/backups/ijfys/daily/ijfys-20260617-020000.sql.gz | psql "$PG_URL"

# 5. 验证关键表
psql "$PG_URL" -c "SELECT count(*) FROM videos;"
psql "$PG_URL" -c "SELECT count(*) FROM users;"
psql "$PG_URL" -c "SELECT count(*) FROM user_favorites;"

# 6. 重启 + 健康检查
pm2 start ijfys-api ijfys-web
bash deploy/scripts/health-check.sh

# 7. 触发 Meili reindex（备份恢复后索引和 DB 不一致）
curl -X POST http://127.0.0.1:4000/api/admin/search/reindex
```

---

## 场景 E：Meilisearch 索引损坏

```bash
# 1. 停 Meili
pm2 stop meilisearch

# 2. 清空索引
rm -rf /var/lib/meili/db/*

# 3. 重启
pm2 start meilisearch

# 4. 重建（API 会自动 ensureIndex；几分钟后 reindex）
curl -X POST http://127.0.0.1:4000/api/admin/search/reindex
# 监控进度
watch -n 5 'curl -s http://127.0.0.1:4000/api/admin/search/stats'
```

Meili 完全挂了：API 的搜索接口会自动 fallback 到 ILIKE + pg_trgm，影响搜索质量但不会全站挂。

---

## 场景 F：完全回滚到上一版本（核选项）

```bash
# 1. 进入维护模式（nginx 临时返回 503）
sudo tee /etc/nginx/sites-enabled/maintenance.conf >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    return 503 'Site is under maintenance, back in 5 minutes.';
}
EOF
sudo systemctl reload nginx

# 2. 数据库 → 备份恢复（场景 D）
# 3. 代码 → 回到上一稳定 tag（场景 A）
# 4. Meili → 重建索引（场景 E）

# 5. 关闭维护模式
sudo rm /etc/nginx/sites-enabled/maintenance.conf
sudo systemctl reload nginx

# 6. 验证
bash deploy/scripts/health-check.sh https://your-domain.com https://your-domain.com
```

---

## rollback.sh 快捷脚本

`deploy/scripts/rollback.sh <scenario> <args>`：

```bash
# 场景 A
bash deploy/scripts/rollback.sh code v1.0.0-beta

# 场景 D
bash deploy/scripts/rollback.sh db /var/backups/ijfys/daily/ijfys-20260617-020000.sql.gz

# 场景 E
bash deploy/scripts/rollback.sh meili

# 场景 F
bash deploy/scripts/rollback.sh full v1.0.0-beta /var/backups/ijfys/daily/ijfys-20260617-020000.sql.gz
```

---

## 回滚后的事后清单

1. **写故障复盘**：保存 pm2 日志快照 + 触发回滚的具体 commit
2. **确认监控告警关闭**：避免告警风暴
3. **通知用户**（如适用）：维护页或弹窗
4. **修复后再次发版**：不要带着旧问题重新上线
5. **更新部署文档**：本文档加新坑

---

## 健康检查阈值

PM2 / Nginx / 外部监控触发回滚的条件参考：

| 指标 | 阈值 | 回滚级别 |
|---|---|---|
| API 5xx 比例 | > 5% / 1min | P1 |
| API p95 延迟 | > 2s / 5min | P2 |
| /api/ready 失败 | 连续 3 次 | P1 |
| DB 连接数 | > 80% max_connections | P1 |
| 磁盘可用 | < 10% | P1（清日志、扩容） |
| Meili 索引 count = 0 | 持续 > 10min | P2（自动 reindex） |
