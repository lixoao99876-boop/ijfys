# 飓风影视 - RC 上线前检查清单

**冻结时间**：2026-06-18  
**版本**：v1.0.0-rc1  
**数据规模**：235,725 视频 / 618K sources / 40 演员 / 60 文章 / 1 专题 / 11 首页频道

---

## ✅ 14 项检查清单

| # | 项 | 状态 | 备注 |
|---|---|---|---|
| 1 | 所有环境变量配置完成 | ✅ | `server/.env.example` + `.env.example` 已生成；JWT_SECRET 生产环境强校验 |
| 2 | Prisma migration 可重复执行 | ✅ | 9 条 migration，含 `pg_trgm` 扩展；`prisma migrate deploy` 幂等 |
| 3 | 数据库备份策略 | ✅ | `deploy/scripts/backup-db.sh` 每日 02:00 + 月备 + 7/90 天滚动 |
| 4 | PM2 配置 | ✅ | `deploy/ecosystem.config.js`：api 1 实例 / web 2 实例 / meili 1 实例 |
| 5 | Nginx 配置 | ✅ | `deploy/nginx/ijfys.conf`：80→443 / TLSv1.2+1.3 / HSTS / gzip / 静态 immutable |
| 6 | SSL 配置 | ✅ | letsencrypt certbot 命令在 README；nginx 配置预留路径 |
| 7 | Sitemap 正常 | ✅ | `/sitemap.xml` 200 OK，含 8 静态路由 + 500 video + 200 article + 200 actor |
| 8 | robots.txt 正常 | ✅ | `/robots.txt` 200 OK，禁 /admin /api，含 sitemap 链接 |
| 9 | RSS 正常 | ✅ | `/rss.xml` 200 OK，输出最新视频 RSS 2.0 |
| 10 | 搜索索引正常 | ✅ | Meilisearch 235,725 文档 · 7ms 响应 · API search 200 OK |
| 11 | Meilisearch 自动重建 | ✅ | `SearchCron` 每日 03:00 全量；admin 写操作钩子 upsertOne |
| 12 | 日志轮转 | ✅ | PM2 配 merge_logs；README 提供 logrotate / pm2-logrotate 两种方案 |
| 13 | 错误监控 | ✅ | `AllExceptionsFilter` 全局捕获 + 5xx log error；Sentry DSN 接口预留 |
| 14 | Rate Limit | ✅ | @nestjs/throttler 全局兜底 200/60s；auth/login 10/60s、register 3/60s、comment 5/60s（实测 11 次起 429） |

---

## 🔒 安全审计

| 项 | 现状 |
|---|---|
| JWT_SECRET 强校验 | 生产环境缺失或默认值 → 启动 fail-fast |
| Cookie 配置 | 生产 `httpOnly + secure + sameSite=strict` |
| CORS | 生产从 `CORS_ORIGINS` 白名单读，缺失时降级允许全部 + warn |
| 密码哈希 | bcryptjs 10 轮 salt |
| Rate Limit | 注册/登录/评论独立 throttle，全局 200/min 兜底 |
| Helmet 安全头 | Nginx 注入 X-Frame-Options / X-Content-Type-Options / Referrer-Policy / HSTS |
| admin 路径 | nginx 配置预留 IP 白名单（注释中）|
| SQL 注入 | 全部走 Prisma + $queryRaw 参数化绑定（trgm 已校验）|
| XSS | React 自动转义；评论已 trim + 长度限制 |
| 上传 body | nginx `client_max_body_size 10M` |
| 错误信息 | 生产 5xx 不泄露 stack；4xx 返简短 message |

## 📊 数据校验

| 项 | 验证 |
|---|---|
| pg_trgm 已启用 | `SELECT * FROM pg_extension WHERE extname='pg_trgm'` |
| sync_state 锁定 PAUSED 可续传 | Phase 4 验证通过 |
| Video.status 流转 | PUBLISHED ↔ UNPUBLISHED ↔ DELETED；同步跳过 DELETED |
| 跨站去重 externalKey | normalized(title)|year，实测三站合流 17.1% |
| Meili 索引一致性 | admin 上下架/编辑/批量自动调 upsertOne；DELETED 自动从索引移除 |

## 🚀 部署速查

```bash
# 1. 配置（替换 JWT_SECRET 等）
cp server/.env.example server/.env && vi server/.env
cp .env.example .env.production && vi .env.production

# 2. 一键准备
bash deploy/scripts/setup.sh

# 3. 启动
pm2 start deploy/ecosystem.config.js
pm2 save && pm2 startup

# 4. Nginx + SSL
sudo cp deploy/nginx/ijfys.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ijfys.com -d www.ijfys.com

# 5. 备份 cron
echo "0 2 * * * /opt/ijfys/deploy/scripts/backup-db.sh" | crontab -

# 6. 健康检查
bash deploy/scripts/health-check.sh
```

## ⚠️ 上线前最后 5 件事

1. **生成强 JWT_SECRET**：`openssl rand -hex 32` → 写入 `server/.env`
2. **配置 MEILI_MASTER_KEY**：`openssl rand -hex 32` → 同步给 ecosystem 和 server/.env
3. **设置 CORS_ORIGINS**：在 server/.env 配 `https://ijfys.com,https://www.ijfys.com`
4. **设置 NEXT_PUBLIC_API_URL** / **NEXT_PUBLIC_SITE_URL**：在 `.env.production` 配生产 URL
5. **首跑后立即触发 Meili reindex**：`curl -X POST https://ijfys.com/api/admin/search/reindex`

## 🛑 已知边界 / 待业务批准事项

| 项 | 当前状态 |
|---|---|
| Sentry 接入 | DSN 占位；如启用需 `pnpm add @sentry/node @sentry/nextjs` |
| OAuth 第三方 | 暂未；接 NextAuth 时需新增页面/接口 |
| 邮件激活 | 注册成功直接登录态；未发激活信 |
| GA4 真实流量 | 仪表盘 PV/UV 仍占位；DailyStat 表空 |
| ffzy backup URL | 当前为空，主域名挂时全部失败；可在 .env 配 `PROVIDER_FFZY_BACKUP_URLS` |

---

**RC 通过 ✓** — 可进入生产部署。
