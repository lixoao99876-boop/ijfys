# 飓风影视 v1.0.0-beta 部署手册

**目标域名**：your-domain.com  
**最低 VPS 配置**：2 vCPU / 4 GB RAM / 60 GB SSD / Ubuntu 22.04 LTS  
**推荐 VPS 配置**：4 vCPU / 8 GB RAM / 100 GB SSD（Meili 索引 + Postgres + Node × 3 进程）

---

## 1. 环境变量清单

执行 `bash deploy/scripts/check-env.sh` 自动校验。下表为完整变量字典：

### server/.env（NestJS）

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `DATABASE_URL` | ✓ | — | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | ✓ | — | **生产必须** 32+ 位随机；`openssl rand -hex 32` |
| `NODE_ENV` | ✓ | — | 设 `production` |
| `PORT` |   | 4000 | NestJS 监听端口 |
| `JWT_EXPIRES` |   | 7d | JWT 有效期 |
| `COOKIE_SECURE` |   | NODE_ENV=production 时 true | 强制 HTTPS-only cookie |
| `CORS_ORIGINS` | ★ | — | 逗号分隔；生产强烈建议设白名单 |
| `MEILI_HOST` |   | http://127.0.0.1:7700 | Meilisearch 地址 |
| `MEILI_API_KEY` | ★ | — | 生产建议设 master key |
| `PROVIDER_FFZY_BASE_URL` |   | https://cj.ffzyapi.com/api.php/provide/vod | 资源站 |
| `PROVIDER_LZZY_BASE_URL` |   | https://cj.lziapi.com/api.php/provide/vod |  |
| `PROVIDER_BFZY_BASE_URL` |   | https://bfzyapi.com/api.php/provide/vod |  |
| `PROVIDER_LZZY_BACKUP_URLS` |   | https://cj.lzcaiji.com/... | 主域挂掉降级 |
| `PROVIDER_FFZY_BACKUP_URLS` | ★ | — | 建议配置 |
| `PROVIDER_BFZY_BACKUP_URLS` | ★ | — | 建议配置 |
| `SYNC_INCREMENTAL_CRON` |   | `*/10 * * * *` | 增量同步 |
| `SYNC_PAGES_PER_RUN` |   | 10 |  |
| `SYNC_HOURS_BACK` |   | 1 |  |
| `MEILI_REINDEX_CRON` |   | `0 3 * * *` | 每日凌晨重建索引 |
| `RATE_LIMIT_ENABLED` |   | true | 设 false 关闭限流 |

★ = 强烈建议但非必填。

### .env.production（Next.js）

| 变量 | 必填 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✓ | 公网 API 地址，例 `https://your-domain.com/api` |
| `API_URL` |   | SSR 时用的内网 API，例 `http://127.0.0.1:4000/api`（避免公网回环） |
| `NEXT_PUBLIC_SITE_URL` | ✓ | sitemap/robots/RSS/OG 用，例 `https://your-domain.com` |

---

## 2. VPS 部署步骤

```bash
# ────────────── (1) 系统准备 ──────────────
ssh root@your-vps
adduser ijfys && usermod -aG sudo ijfys
su - ijfys

sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw fail2ban
sudo ufw default deny incoming
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# ────────────── (2) Node 20 + pnpm + PM2 ──────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pnpm pm2

# ────────────── (3) PostgreSQL 14 ──────────────
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql <<EOF
CREATE USER ijfys WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE ijfys OWNER ijfys;
GRANT ALL PRIVILEGES ON DATABASE ijfys TO ijfys;
EOF
# 仅监听 127.0.0.1（默认）
sudo sed -i "s/^#listen_addresses.*/listen_addresses = 'localhost'/" /etc/postgresql/14/main/postgresql.conf
sudo systemctl restart postgresql

# ────────────── (4) Meilisearch（详见任务 6）──────────────
curl -L https://install.meilisearch.com | sh
sudo mv meilisearch /usr/local/bin/
sudo mkdir -p /var/lib/meili
sudo chown ijfys:ijfys /var/lib/meili

# ────────────── (5) 拉代码 ──────────────
sudo mkdir -p /opt/ijfys && sudo chown ijfys:ijfys /opt/ijfys
cd /opt/ijfys
git clone https://github.com/YOUR/ijfys.git .

# ────────────── (6) 配置 .env ──────────────
cp server/.env.example server/.env
cp .env.example .env.production

# 生成强密钥
JWT=$(openssl rand -hex 32)
MEILI=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT"
echo "MEILI_MASTER_KEY=$MEILI"

# 编辑 server/.env：
#   DATABASE_URL=postgresql://ijfys:STRONG_PASSWORD_HERE@localhost:5432/ijfys?schema=public
#   JWT_SECRET=<上面的 JWT>
#   NODE_ENV=production
#   CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
#   MEILI_API_KEY=<上面的 MEILI>
#   PROVIDER_FFZY_BACKUP_URLS=(可选填一个 ffzy 镜像域名)
nano server/.env

# 编辑 .env.production：
#   NEXT_PUBLIC_API_URL=https://your-domain.com/api
#   API_URL=http://127.0.0.1:4000/api
#   NEXT_PUBLIC_SITE_URL=https://your-domain.com
nano .env.production

# ────────────── (7) 一键准备 ──────────────
bash deploy/scripts/check-env.sh        # 验证 .env 完整
bash deploy/scripts/setup.sh            # 装依赖 + migrate + build

# ────────────── (8) PM2 启动 ──────────────
# 修改 ecosystem.config.js 加入 MEILI_MASTER_KEY
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup    # 输出一条 systemctl 命令，复制执行

# ────────────── (9) Nginx + SSL（详见任务 3、7）──────────────

# ────────────── (10) 备份 cron（详见任务 5）──────────────

# ────────────── (11) 验证（详见任务 8）──────────────
bash deploy/scripts/health-check.sh https://your-domain.com https://your-domain.com
```

---

## 3. Nginx 配置

完整文件：[`deploy/nginx/ijfys.conf`](deploy/nginx/ijfys.conf)

要点：

- 80 → 443 强跳
- TLSv1.2 / TLSv1.3，禁用旧密码套件
- HSTS 2 年 + includeSubDomains
- 安全头：X-Frame-Options / X-Content-Type-Options / Referrer-Policy
- 静态资源 `_next/static/*` 缓存 365 天 immutable
- `client_max_body_size 10M` 防大包
- `/api/*` 反代到 127.0.0.1:4000
- `/` 反代到 127.0.0.1:3000

部署：

```bash
sudo cp deploy/nginx/ijfys.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/ijfys.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

可选：admin 接口加 IP 白名单（在 nginx.conf 中取消注释 `/api/admin/` block）：

```nginx
location /api/admin/ {
    allow 1.2.3.4;       # 运维办公室 IP
    allow 5.6.7.8;
    deny all;
    proxy_pass http://ijfys_api;
}
```

---

## 4. PM2 配置

完整文件：[`deploy/ecosystem.config.js`](deploy/ecosystem.config.js)

3 个 app：

| App | 实例 | 模式 | 内存上限 | 备注 |
|---|---|---|---|---|
| `ijfys-api` | 1 | fork | 1G | NestJS Cron 不支持多实例 |
| `ijfys-web` | 2 | cluster | 768M each | Next.js 可水平扩展 |
| `meilisearch` | 1 | fork | 2G | 必须由 PM2 守护以确保自启 |

常用命令：

```bash
pm2 list                      # 看进程
pm2 logs ijfys-api --lines 100
pm2 logs --err                # 仅看错误
pm2 reload ijfys-web          # 零停机重载
pm2 restart ijfys-api         # 重启（短暂中断）
pm2 monit                     # 实时 CPU/内存
pm2 save                      # 保存当前进程列表
pm2 resurrect                 # 系统重启后恢复
```

日志轮转 — 两选一：

```bash
# 方案 A：系统 logrotate
sudo tee /etc/logrotate.d/ijfys >/dev/null <<'EOF'
/var/log/pm2/ijfys-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

# 方案 B：PM2 自带
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```

---

## 5. PostgreSQL 备份策略

完整脚本：[`deploy/scripts/backup-db.sh`](deploy/scripts/backup-db.sh)

策略：

- **每日**：`/var/backups/ijfys/daily/`，保留 7 天
- **月初**（每月 1 号）：`/var/backups/ijfys/monthly/`，保留 90 天
- 自动 gzip
- 失败时退出码非 0（cron 邮件告警）

部署：

```bash
sudo mkdir -p /var/backups/ijfys/{daily,monthly}
sudo chown ijfys:ijfys /var/backups/ijfys -R
crontab -e
# 加入：
0 2 * * * /opt/ijfys/deploy/scripts/backup-db.sh >> /var/log/ijfys-backup.log 2>&1
```

恢复：

```bash
# 停止 API 防数据冲突
pm2 stop ijfys-api

# 恢复某个备份
gunzip < /var/backups/ijfys/daily/ijfys-20260618-020000.sql.gz \
  | psql "postgresql://ijfys:STRONG_PASSWORD@localhost:5432/ijfys"

# 验证 + 重启
pm2 start ijfys-api
```

异地备份（强烈建议）：

```bash
# 加到 backup-db.sh 末尾：rsync 到对象存储或备份机
rclone copy /var/backups/ijfys/ remote:ijfys-backups/ --max-age 30d
```

---

## 6. Meilisearch 部署方案

### 安装

```bash
# 二进制（Linux）
curl -L https://install.meilisearch.com | sh
sudo mv meilisearch /usr/local/bin/
meilisearch --version    # 应为 1.x
```

### 数据目录

```bash
sudo mkdir -p /var/lib/meili/db /var/lib/meili/dumps
sudo chown -R ijfys:ijfys /var/lib/meili
```

### 配置（生产）

PM2 启动（推荐，配置写在 `ecosystem.config.js`）：

```js
{
  name: "meilisearch",
  script: "/usr/local/bin/meilisearch",
  args: [
    "--db-path", "/var/lib/meili/db",
    "--dump-dir", "/var/lib/meili/dumps",
    "--http-addr", "127.0.0.1:7700",     // 仅 127.0.0.1，不暴露公网
    "--env", "production",
    "--no-analytics",
    "--master-key", process.env.MEILI_MASTER_KEY,
  ].join(" "),
  env: { MEILI_MASTER_KEY: "<openssl rand -hex 32>" },
  ...
}
```

或 systemd（替代 PM2）：

```bash
sudo tee /etc/systemd/system/meilisearch.service >/dev/null <<'EOF'
[Unit]
Description=Meilisearch
After=network.target

[Service]
User=ijfys
ExecStart=/usr/local/bin/meilisearch \
  --db-path /var/lib/meili/db \
  --http-addr 127.0.0.1:7700 \
  --env production \
  --no-analytics
Environment="MEILI_MASTER_KEY=<KEY>"
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now meilisearch
```

### 数据持久化

- DB 目录：`/var/lib/meili/db`（随同步增长，预留 5GB+）
- 每日由 `MEILI_REINDEX_CRON=0 3 * * *` 自动重建，**无需备份**（可从 Postgres 重建）

### 备份（可选）

```bash
# 创建 dump
curl -X POST 'http://127.0.0.1:7700/dumps' \
  -H "Authorization: Bearer $MEILI_MASTER_KEY"
# dump 存到 /var/lib/meili/dumps/<id>.dump
```

### 监控

- `GET /api/admin/search/stats` — 返 `{available, count, isIndexing}`
- `GET /api/ready` 含 Meili 健康检查
- 触发手动重建：`POST /api/admin/search/reindex`

---

## 7. SSL 配置方案

### Let's Encrypt（推荐，免费 + 自动续期）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com \
  --agree-tos --email admin@your-domain.com --redirect --hsts

# 续期（certbot 自动加 cron，验证）
sudo certbot renew --dry-run

# 强制现在续期
sudo certbot renew --force-renewal
```

certbot 自动续期 cron：`/etc/cron.d/certbot` 已就位。

### 验证 SSL 配置质量

```bash
# 命令行
curl -sI https://your-domain.com | head -10

# 在线评分（A+ 标准）
# https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

期望评分 ≥ A：

- Protocol Support：仅 TLSv1.2 + TLSv1.3 ✓
- Key Exchange：ECDHE ✓
- Cipher Strength：256+ ✓
- HSTS：max-age=63072000 ✓

### Cloudflare（可选 CDN + DDoS）

如使用 Cloudflare：

1. DNS A 记录指向 VPS IP，**关闭橙云**先做 letsencrypt 验证
2. 拿到证书后打开橙云
3. SSL/TLS 模式选 **Full (strict)**
4. 关闭 "Always Use HTTPS"（已在 nginx 做了 301）
5. Rocket Loader 禁用（影响 Next.js）

---

## 8. 上线验证步骤

完整脚本：[`deploy/scripts/health-check.sh`](deploy/scripts/health-check.sh)

```bash
bash deploy/scripts/health-check.sh https://your-domain.com https://your-domain.com
```

预期输出（全部 200/ok）：

```
=== API health ===                {"status":"ok","ts":"..."}
=== Readiness ===                 {"status":"ok","checks":{"db":...,"meili":...}}
=== sitemap.xml ===               HTTP/2 200
=== robots.txt ===                HTTP/2 200
=== rss.xml ===                   HTTP/2 200
=== /api/home/configured ===      → 200
=== /api/search?q=三体 ===         → 200
=== Meili stats ===               {"available":true,"count":235725,...}
```

### 手动 7 步上线验证

1. **首页**：`https://your-domain.com/` — banner 渲染，频道有视频
2. **分类**：`https://your-domain.com/category/movie` — 14 类型/11 地区/11 年代筛选 chip 出现
3. **详情**：`https://your-domain.com/vod/<id>` — 封面/简介/线路/评论框
4. **播放**：`https://your-domain.com/play/<id>/<ep>` — m3u8 可播，自动切线
5. **搜索**：`https://your-domain.com/search?q=三体` — Meili 结果 + 演员/资讯分组
6. **注册登录**：`/register` → 成功跳 `/me`，能加收藏
7. **后台**：`https://your-domain.com/admin` — 仪表盘真实数据 + 触发同步按钮

### 流量回归

接通 GA4 / Plausible 后，DailyStat 表会自动累积。仪表盘 7 天 sparkline 会自动有数据。

---

## 9. 回滚方案

详见 [`ROLLBACK.md`](ROLLBACK.md)。

核心命令：

```bash
# 代码回滚（git tag）
cd /opt/ijfys
git tag v1.0.0-beta-rollback-$(date +%Y%m%d) HEAD     # 标记当前状态
git checkout <previous-tag>
bash deploy/scripts/setup.sh
pm2 reload all

# 数据库回滚（migration）
cd server
./node_modules/.bin/prisma migrate resolve --rolled-back <migration-name>
# 然后从备份恢复（任务 5）

# 单服务回滚
pm2 reload ijfys-api      # 只重启 API
pm2 reload ijfys-web      # 只重启 Web
```

---

## 10. Release Notes

详见 [`RELEASE_NOTES_v1.0.0-beta.md`](RELEASE_NOTES_v1.0.0-beta.md)。
