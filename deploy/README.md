# 飓风影视 - 部署文档

## 环境要求

| 组件 | 版本 | 说明 |
|---|---|---|
| Node.js | 20+ | pnpm 9+ |
| PostgreSQL | 14+ | 扩展：`pg_trgm`（migration 自动启用） |
| Meilisearch | 1.x | 搜索引擎（缺失时降级到 trgm） |
| Nginx | 1.18+ | 反向代理 |
| PM2 | 5+ | 进程管理 |
| certbot | latest | letsencrypt SSL |

## 端口

| 端口 | 服务 | 暴露 |
|---|---|---|
| 3000 | Next.js | 仅 127.0.0.1 |
| 4000 | NestJS API | 仅 127.0.0.1 |
| 5432 | PostgreSQL | 仅 127.0.0.1 |
| 7700 | Meilisearch | 仅 127.0.0.1 |
| 80 / 443 | Nginx | 公网 |

## 全新机器部署步骤

```bash
# 1) 拉代码 + 配置
git clone <repo> /opt/ijfys
cd /opt/ijfys
cp server/.env.example server/.env
cp .env.example .env.production
# 修改 server/.env: JWT_SECRET=$(openssl rand -hex 32) / DATABASE_URL / PUBLIC_SITE_URL
# 修改 .env.production: NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SITE_URL

# 2) Meili 安装（macOS brew / Linux 二进制）
# Linux: curl -L https://install.meilisearch.com | sh
brew install meilisearch  # mac

# 3) 一键初始化
bash deploy/scripts/setup.sh

# 4) 启动 (PM2)
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup    # 输出系统级 systemctl 命令

# 5) Nginx
sudo cp deploy/nginx/ijfys.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/ijfys.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6) SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 7) 自动备份 cron
crontab -e
# 加入: 0 2 * * * /opt/ijfys/deploy/scripts/backup-db.sh

# 8) 健康检查
bash deploy/scripts/health-check.sh
```

## 日志轮转

PM2 已配 `merge_logs: true`。日志路径：`/var/log/pm2/ijfys-*.log`。配置 logrotate：

```bash
sudo tee /etc/logrotate.d/ijfys <<EOF
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
```

或使用 pm2-logrotate：

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

## 自动同步

NestJS 启动后内置 cron 自动跑：

- **资源站增量同步**：`*/10 * * * *`（每 10 分钟 hours=1）
- **Meili 全量重建**：`0 3 * * *`（每日 03:00，可由 `MEILI_REINDEX_CRON` 覆盖；置空字符串则不跑）
- **同步状态修复**：失败 PAUSED 状态下次自动续传

手动触发：

```bash
# 单站全量
curl -X POST http://127.0.0.1:4000/api/admin/providers/lzzy/sync \
  -H "Content-Type: application/json" -d '{"type":"full"}'

# Meili 全量重建
curl -X POST http://127.0.0.1:4000/api/admin/search/reindex
```

## 监控

健康检查端点（部署到 PM2/k8s/外部探针）：

```
GET /api/health      Liveness（仅检查进程存活）
GET /api/ready       Readiness（检查 DB / Meili）
```

## 备份恢复

```bash
# 恢复某次备份
gunzip < /var/backups/ijfys/daily/ijfys-20260618-020000.sql.gz \
  | psql "postgresql://ijfys:ijfys@localhost:5432/ijfys"
```

## 安全 checklist

- [ ] server/.env 文件 `chmod 600`
- [ ] `JWT_SECRET` 至少 32 位随机
- [ ] `MEILI_MASTER_KEY` 生产环境必填
- [ ] Nginx 加 `client_max_body_size 10M` 防大包
- [ ] admin 接口建议加 IP 白名单（nginx 注释中）
- [ ] PostgreSQL listen_addresses 仅 127.0.0.1
- [ ] firewall 仅开 22/80/443

## 故障速查

| 现象 | 原因 | 处理 |
|---|---|---|
| API 启动 fail-fast | `JWT_SECRET` 未设或过短 | 设强密钥 + restart |
| 同步 PAUSED | 连续 3 页拉取失败 | 等下轮 cron 自动续传，或 `pnpm sync:lzzy` 手动 |
| 搜索结果异常 | Meili 索引过期 | 触发 `/api/admin/search/reindex` |
| 502 BadGateway | upstream 未启 | `pm2 list` 看进程 |
| 评论不显示 | 审核未通过 | 后台 /admin/system/comments 批量通过 |
