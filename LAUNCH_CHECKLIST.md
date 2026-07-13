# 飓风影视 - 上线 Launch Checklist

> ⚠ 示例域名 `your-domain.com` 仅为占位，实际部署请替换为真实域名

**版本**：v1.0.0-beta  
**目标 VPS**：root@76.13.251.55（Ubuntu 24.04 LTS / 2 vCPU / 7.8G RAM / 96G 磁盘）  
**部署目录**：`/opt/ijfys`

---

## 🅰 上线前准备（在你本机/管理后台做完）

### A1. GitHub
- [ ] 工作区干净（`git status` 无未提交）
- [ ] 当前 commit：`72850eb refactor: 域名模板化`
- [ ] **修正 remote URL 拼写**（当前 `lixoao` 与你最初给的 `lixaoo` 不一致）：
   ```bash
   # 如正确账号是 lixaoo：
   git remote set-url origin https://github.com/lixaoo99876-boop/ijfys.git
   # 如正确账号是 lixoao（与 email 一致）：保持现状
   ```
- [ ] **本地领先 origin 1 个 commit，需 push**：
   ```bash
   git push -u origin main
   # （第一次需 GitHub PAT 或 SSH key）
   ```
- [ ] 打 release tag：
   ```bash
   git tag -a v1.0.0-beta -m "v1.0.0-beta initial release"
   git push origin v1.0.0-beta
   ```

### A2. DNS 配置（域名注册商后台）
- [ ] `A` 记录：`your-domain.com` → `76.13.251.55`
- [ ] `A` 记录：`www.your-domain.com` → `76.13.251.55`
- [ ] DNS 传播验证（≤10 min）：
   ```bash
   dig +short your-domain.com           # 应输出 76.13.251.55
   dig +short www.your-domain.com       # 应输出 76.13.251.55
   ```

### A3. 凭据生成（保存到密码管理器，不要提交）
- [ ] JWT_SECRET：`openssl rand -hex 32`
- [ ] MEILI_MASTER_KEY：`openssl rand -hex 32`
- [ ] DB_PASSWORD：`openssl rand -base64 24`（无空格特殊字符版）

---

## 🅱 VPS 准备

### B1. 缺失依赖装（按顺序）

| 依赖 | 当前 | 操作 |
|---|---|---|
| Node v22 | ✅ 已装 | — |
| npm 10 | ✅ 已装 | — |
| PM2 7.0 | ✅ 已装 | — |
| Nginx 1.24 | ✅ 已装 | — |
| certbot 2.9 | ✅ 已装 | — |
| git 2.43 | ✅ 已装 | — |
| **pnpm** | ❌ | `sudo npm i -g pnpm` |
| **PostgreSQL 16** | ❌ | `sudo apt install -y postgresql postgresql-contrib` |
| **Meilisearch 1.x** | ❌ | `curl -L https://install.meilisearch.com \| sh && sudo mv meilisearch /usr/local/bin/` |

### B2. 已占用资源（避免冲突）
- ✅ 端口 3000/4000/5432/7700 全空闲
- ⚠️ VPS 已跑 **51bi**（PM2 / nginx site）+ **aiskill88.xyz**（PM2 aiskill-admin/tg-bot）
- ⚠️ Nginx multi-site 中，添加 `ijfys.conf` 时**禁止** `default_server`
- ⚠️ PM2 进程名前缀 `ijfys-` 已规划，与现有 `aiskill-*` 不冲突
- ✅ certbot 自动续期 cron 已就绪（验证：`sudo systemctl list-timers | grep certbot`）

### B3. PostgreSQL 初始化（VPS 上执行）
```bash
sudo -u postgres psql <<EOF
CREATE USER ijfys WITH PASSWORD 'YOUR_STRONG_DB_PASSWORD';
CREATE DATABASE ijfys OWNER ijfys;
GRANT ALL PRIVILEGES ON DATABASE ijfys TO ijfys;
EOF
# 验证
sudo -u postgres psql -c "\du ijfys"
sudo -u postgres psql -c "\l ijfys"
```

### B4. Meilisearch 启动准备
```bash
sudo mkdir -p /var/lib/meili/{db,dumps}
# 用 root 部署（与现有 51bi/aiskill88 保持一致）
```

---

## 🅲 部署执行（按顺序，每步必须验证）

### C1. 拉代码
```bash
sudo mkdir -p /opt/ijfys && cd /opt/ijfys
git clone https://github.com/lixoao99876-boop/ijfys.git .
git checkout v1.0.0-beta
```

### C2. 配 .env
```bash
cd /opt/ijfys
cp deploy/templates/production.env.server.template server/.env
cp deploy/templates/production.env.web.template .env.production
nano server/.env       # 填 DATABASE_URL / JWT_SECRET / MEILI_API_KEY / 域名
nano .env.production   # 填 NEXT_PUBLIC_SITE_URL / API_URL

# 严格校验
bash deploy/scripts/check-env.sh   # 必须 0 FAIL
```

### C3. 一键准备
```bash
bash deploy/scripts/setup.sh
```
预期输出：
- ✓ DB 可连
- ✓ Prisma migrate 应用 9 条 migration
- ✓ pg_trgm 扩展启用
- ✓ Seed providers（3 个）
- ✓ Next.js build 完成
- ✓ 生成 `deploy/nginx/ijfys.conf`

### C4. PM2 启动
```bash
# 编辑 ecosystem.config.js，加入 MEILI_MASTER_KEY 到 meilisearch app env
nano deploy/ecosystem.config.js

pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup           # 复制输出的 systemctl 命令执行
```
验证：
- [ ] `pm2 list` 显示 ijfys-api / ijfys-web / meilisearch 均 online
- [ ] `curl http://127.0.0.1:4000/api/health` → `{"status":"ok"}`
- [ ] `curl http://127.0.0.1:3000/` → 200

### C5. Nginx 配置
```bash
sudo cp /opt/ijfys/deploy/nginx/ijfys.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/ijfys.conf /etc/nginx/sites-enabled/
sudo nginx -t                          # 必须 ok
sudo systemctl reload nginx
```

### C6. SSL 签发
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com \
  --agree-tos --email admin@your-domain.com --redirect --hsts
```
预期：自动修改 nginx 配置加 listen 443 ssl，证书自动续期 cron 已就绪。

### C7. 备份 cron
```bash
sudo mkdir -p /var/backups/ijfys/{daily,monthly}
crontab -e
# 加入：
0 2 * * * /opt/ijfys/deploy/scripts/backup-db.sh >> /var/log/ijfys-backup.log 2>&1
```

### C8. 触发首次 Meili reindex
```bash
curl -X POST http://127.0.0.1:4000/api/admin/search/reindex
# 等 30 秒
curl http://127.0.0.1:4000/api/admin/search/stats
# 期望：{"available":true,"count":>0,...}
```

---

## 🅳 上线验证（在浏览器 + 自动化双向验证）

### D1. 基础设施
- [ ] **DNS**：`dig +short your-domain.com` → `76.13.251.55`
- [ ] **HTTPS 重定向**：`curl -sI http://your-domain.com` → 301 → https
- [ ] **SSL 证书**：`curl -sI https://your-domain.com | grep -i strict` → HSTS 头存在
- [ ] **SSL Labs 评分**：[ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com) ≥ A
- [ ] **健康端点**：`curl https://your-domain.com/api/health` → `{"status":"ok"}`
- [ ] **就绪端点**：`curl https://your-domain.com/api/ready` → db + meili 两个 ok
- [ ] **运行**：`bash /opt/ijfys/deploy/scripts/health-check.sh https://your-domain.com https://your-domain.com` 全绿

### D2. SEO 三件套
- [ ] `https://your-domain.com/sitemap.xml` → 200 + XML，含 8 静态路由 + 视频/文章/演员
- [ ] `https://your-domain.com/robots.txt` → 200，含 `Sitemap: https://your-domain.com/sitemap.xml`，禁 `/admin`, `/api`
- [ ] `https://your-domain.com/rss.xml` → 200 + RSS 2.0，含最新视频

### D3. Search（Meilisearch）
- [ ] `curl 'https://your-domain.com/api/search?q=三体'` → 含 `items[]` 数组
- [ ] 浏览器访问 `/search?q=赵丽颖` → 显示演员 + 相关影片
- [ ] Meili 索引数 > 0：`curl https://your-domain.com/api/admin/search/stats`

### D4. 用户系统（Login / Favorites / Comments）
- [ ] 访问 `/register` → 注册成功 → 自动登录 → 跳 `/me`
- [ ] 访问 `/login` → 登录现有账号成功
- [ ] 顶栏显示用户头像
- [ ] vod 详情页 "+ 收藏" 按钮可点 → 变 "★ 已收藏"
- [ ] `/me` 页面 "我的收藏" tab 显示刚收藏的视频
- [ ] vod 详情页底部 "发表评论" 文本框，输入后提交 → 提示"已提交待审核"
- [ ] 在 `/admin/system/comments?status=PENDING` 看到该评论 → 通过 → 公网刷新可见

### D5. Play（核心播放体验）
- [ ] 点首页任意视频 → 详情页加载封面/简介/线路
- [ ] 点"立即播放" → 播放页加载，m3u8 视频可播
- [ ] 切换线路按钮可用
- [ ] 模拟线路失败：在 DevTools 中阻断 m3u8 请求 → 应**自动切换**到下一线路
- [ ] 长剧集（>50 集）→ 集数分组 chip 显示

### D6. 后台管理
- [ ] `https://your-domain.com/admin` → 仪表盘显示真实数据（视频 / 演员 / 文章 / 同步状态）
- [ ] `/admin/content/videos` → 视频列表分页 + 搜索 + 上下架按钮可点
- [ ] `/admin/resources/providers` → "手动同步" 按钮触发后 `/api/admin/sync-logs` 出现 RUNNING 记录
- [ ] `/admin/system/logs` → 显示刚才的 TRIGGER_SYNC / TOGGLE_PROVIDER 等 audit 记录
- [ ] `/admin/system/comments` → 评论审核功能可用

### D7. 同步与采集
- [ ] 资源站状态：`/admin/resources/providers` 三站 ACTIVE
- [ ] cron 每 10 分钟增量自动跑：`pm2 logs ijfys-api | grep "video page"` 可见
- [ ] 触发全量同步（lzzy）：`curl -X POST .../api/admin/providers/lzzy/sync -d '{"type":"full"}'`
- [ ] 同步进度可见：`/admin/resources/sync`

### D8. 监控与告警（24h 内）
- [ ] PM2 进程 24h 0 重启：`pm2 list`
- [ ] 错误日志：`pm2 logs --err | tail -50` 0 异常
- [ ] 磁盘占用：`df -h /` 增长合理（数据库会随同步增长）
- [ ] DB 连接数：`psql -c "SELECT count(*) FROM pg_stat_activity"` < 20
- [ ] Meili 内存：`pm2 monit` < 2G
- [ ] 备份生效：第二天 02:01 检查 `/var/backups/ijfys/daily/` 有新文件

---

## 🅴 上线后 7 天关注

| 时间 | 验证 | 操作 |
|---|---|---|
| 1h | 注册第一个真实用户 | 自己测一遍流程 |
| 6h | 同步进度 | `/admin/resources/sync` 看 cron 增量 |
| 24h | 备份是否生成 | `ls -la /var/backups/ijfys/daily/` |
| 24h | SSL labs 评分 | 重新跑一次确认 |
| 3d | 评论审核流量 | `/admin/system/comments?status=PENDING` 有用户评论 |
| 7d | Meili 索引同步 | `MEILI_REINDEX_CRON` 03:00 自动跑过 |
| 7d | 日志轮转 | `/var/log/pm2/` 有压缩备份 |

---

## 🚨 关键风险点

| 风险 | 影响 | 缓解 |
|---|---|---|
| DNS 未传播 | certbot 签发失败 | A2 验证 dig 输出后再做 C6 |
| JWT_SECRET 错配 | 所有用户登录失败 | check-env.sh 强校验 |
| MEILI_API_KEY 不一致 | 搜索 401 但全站不挂 | API 自动降级到 trgm，立即修复后 reindex |
| nginx upstream 端口错 | 502 全站挂 | C4 `pm2 list` 确认端口后再 C5 |
| 与现有 51bi/aiskill88 端口冲突 | 这台 VPS 上跑了 2 个其他项目 | B2 已验证 ijfys 端口全空闲 |
| **同步压垮 VPS** | 全量跑时 RAM/CPU 100% | 推荐先跑 `--full --pages=200` 小批量验证 |
| 备份没生成 | 失数据无法恢复 | D8 第 24h 必查 |
| nginx default_server 误绑定 | 流量被错误站点接收 | C5 必须 `nginx -t` 通过再 reload |

---

## 📞 紧急回滚

```bash
bash /opt/ijfys/deploy/scripts/rollback.sh maintenance on   # 503 全站
bash /opt/ijfys/deploy/scripts/rollback.sh full v1.0.0-beta /var/backups/ijfys/daily/<file>.sql.gz
```

详见 [ROLLBACK.md](ROLLBACK.md)。

---

## ✅ 上线放行标准

| 必须项 | 状态 |
|---|---|
| 上面 D1–D8 全打勾 | [ ] |
| 至少完成一次端到端用户流程（注册 → 收藏 → 播放） | [ ] |
| 24h 监控无重启 / 0 异常 5xx | [ ] |
| 备份脚本生成第一份日备 | [ ] |
| SSL labs ≥ A | [ ] |
| Sentry / 日志告警接入（可选） | [ ] |

**全部 ✓ → 进入 Beta 公开 → 监控 7 天 → 决定 v1.0.0 正式 release**
