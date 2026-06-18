# 飓风影视 - v1.0.0-beta

**发布日期**：2026-06-18  
**版本**：v1.0.0-beta（Public Beta）  
**域名**：[your-domain.com](https://your-domain.com)  
**Codename**：Hurricane

---

## 🌀 项目简介

飓风影视是一个聚合多个公开影视资源站的在线观看平台。支持：
- **跨站去重 + 多线路聚合**：同名作品自动合流为一个 Video，多个 provider 的线路并列挂载
- **运营后台**：完整的内容/资源/统计管理，参考 Vercel/Linear 风格
- **搜索引擎**：Meilisearch 235K 文档级，毫秒响应
- **用户系统**：注册 / 登录 / 收藏 / 历史 / 评分 / 评论（审核制）
- **SEO 完整**：sitemap / robots / RSS / OpenGraph / JSON-LD

---

## 📊 上线数据规模

| 项 | 数量 |
|---|---|
| 资源站对接 | **3 个**（FFZY 非凡 / LZZY 量子 / BFZY 暴风） |
| 视频数（聚合去重后） | **235,725** |
| 播放线路 sources | **618,252** 条 |
| 平均每视频 | **2.62 条** 线路 |
| 三站全命中视频 | **40,287 条**（17.1%） |
| 规范化分集 episodes | **3,877,931** |
| m3u8 播放链接 | **10,025,684** 条 |
| Meilisearch 索引 | **235,725** 文档（毫秒级搜索） |

按分类（PUBLISHED）：
- 短剧 **38,001** · 电影 **28,286** · 剧集 **16,758** · 综艺 **15,420** · 动漫 **5,286**

---

## ✨ 核心功能

### 用户端

- **首页**：11 个运营频道（Banner / 今日推荐 / 热播榜 / 高分影片 / 即将上映 / 最近更新 / 5 大分类热门）
- **专题合集** `/collection/:slug`：运营可自定义打包主题
- **筛选**：14 类型 / 11 地区 / 11 年代（聚合标签 → DB 多值匹配）
- **演员页** `/actor/:id`：演员资料 + 参演作品反查
- **资讯页** `/article/:id`：上一篇 / 下一篇 / 相关推荐
- **搜索**：Meilisearch 优先 + ILIKE/trgm 双降级，影片/演员/资讯分组返回；本地搜索历史
- **播放器**：ArtPlayer + HLS.js；线路按评分排序；失败自动切下一线路；首帧响应埋点
- **个人中心** `/me`：我的收藏 / 观看历史 / 我的评分

### 后台

- **仪表盘**：内容资产 + 资源站成功率排行 + 热门影片 + 热门搜索 + 7 天 sparkline（PV/UV 占位）
- **内容管理**：视频（搜索/筛选/编辑/批量上下架/删除）/ 演员 / 文章 / 专题合集
- **资源管理**：资源站（手动同步/全量/启停）/ 线路（按站筛选）/ 同步任务（按 entity/status）
- **统计**：热门内容 Top 100 三 tab（影片/演员/搜索）
- **系统**：管理员 / 角色权限 / **评论审核**（PENDING/APPROVED/REJECTED + 批量）/ 操作日志
- **设置**：首页配置（11 频道 + 拖拽排序 + 自动补齐）/ SEO / 网站配置

### 自动化

- **资源站同步**：cron 每 10 分钟增量；断点续传 + 页级 3 次指数退避重试 + 连续 3 页失败自动 PAUSED
- **Meilisearch 重建**：每日 03:00 全量；admin 上下架/编辑触发 upsertOne 增量
- **资源站评分**：5 维元数据 + 播放 telemetry（success/fail/avgResponseTime）

---

## 🛡 安全特性

- bcryptjs 10-round password hashing
- JWT cookie：`httpOnly + secure + sameSite=strict`（生产）
- JWT_SECRET 生产强校验（缺失或 < 32 位则启动 fail-fast）
- Rate Limit：登录 10/min · 注册 3/min · 评论 5/min · 全局 200/min
- 全局异常过滤器：5xx 不泄露 stack；统一日志格式
- 评论审核制：所有评论默认 PENDING，运营审核通过才展示
- Nginx 安全头：HSTS / X-Frame-Options / X-Content-Type-Options / Referrer-Policy
- TLSv1.2 + TLSv1.3 / ECDHE 套件 / Let's Encrypt 自动续期

---

## 🧱 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15 · React 19 · TypeScript · Tailwind v3 · Zustand · ArtPlayer + HLS.js |
| 后端 | NestJS 10 · Prisma 5 · `@nestjs/schedule` · `@nestjs/throttler` |
| 数据库 | PostgreSQL 16 · pg_trgm 扩展 |
| 搜索 | Meilisearch 1.x |
| 鉴权 | JWT (HS256) · bcryptjs · HTTP-only cookie |
| 部署 | PM2 · Nginx · Let's Encrypt · Ubuntu 22.04 |
| 监控 | PM2 日志 · `/api/health` · `/api/ready` · `health-check.sh` |

---

## 📈 6 个开发阶段（10 天）

| Phase | 主题 | 完成时间 |
|---|---|---|
| 1 | Frontend UI + mock | 06-15 |
| 2 | Resource ingest（FFZY/LZZY/BFZY） | 06-16 |
| 3 | 运营后台 IA + 写操作 + 仪表盘 | 06-17 |
| 4 | SEO + 首页配置 + 演员/文章页 | 06-17 |
| 5 | 流媒体产品（专题/推荐/搜索增强） | 06-17 |
| 6 | Beta 上线版（Auth/收藏/历史/评论/Meili） | 06-18 |
| RC | Feature Freeze + 部署准备 | 06-18 |

---

## 🔁 数据库迁移历史

9 条 Prisma migrations：

```
20260615145922_init
20260617105233_add_actors_articles_synclog_entity
20260617152759_add_sync_state
20260617160932_add_source_play_telemetry
20260618033637_phase3_ops
20260618035731_phase4_home_config
20260618043419_phase5_user_collection
20260618075022_phase6_comments_status
20260618143000_enable_pg_trgm
```

总表数：18 张（含 _prisma_migrations）。

---

## 🚨 已知问题 / Beta 限制

| 类别 | 说明 |
|---|---|
| **流量统计** | 仪表盘 PV/UV/DAU 仍为占位 `—`；需接 GA4 / Plausible / 自建埋点 |
| **演员/文章数据** | 仅 40 个 actor + 60 篇 article（Phase 2 测试数据）；FFZY/BFZY 无 actor/article 接口；LZZY 全量需手动 `pnpm sync:lzzy --full` |
| **FFZY 备用域名** | 当前 `PROVIDER_FFZY_BACKUP_URLS` 未配置；主域名挂时无降级 |
| **评论审核** | 全部默认 PENDING；首次上线建议设置审核员 + 通知机制 |
| **OAuth 第三方** | 暂不支持；只能用户名/密码注册登录 |
| **邮件功能** | 找回密码 / 邮件激活未实现 |
| **拼音搜索** | Meili 不支持中文分词的拼音匹配（仅匹配 actor_en 字段） |
| **CDN** | Cloudflare 接入文档已写，但未部署 |
| **移动端 App** | 仅 Web；导航有 "APP" 入口但未实现 |
| **支付 / VIP** | UserRole 字段已留 VIP，未接入支付 |

---

## 🚀 部署速查

```bash
git clone <repo> /opt/ijfys && cd /opt/ijfys
cp server/.env.example server/.env && nano server/.env       # 配 JWT_SECRET / DATABASE_URL / CORS_ORIGINS
cp .env.example .env.production && nano .env.production       # 配 API_URL / SITE_URL
bash deploy/scripts/check-env.sh                              # 校验
bash deploy/scripts/setup.sh                                  # 一键准备
pm2 start deploy/ecosystem.config.js && pm2 save && pm2 startup
sudo cp deploy/nginx/ijfys.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
echo "0 2 * * * /opt/ijfys/deploy/scripts/backup-db.sh" | crontab -
bash deploy/scripts/health-check.sh https://your-domain.com https://your-domain.com
```

详见 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 🆘 故障 / 回滚

```bash
bash deploy/scripts/rollback.sh code <prev-tag>
bash deploy/scripts/rollback.sh db /var/backups/ijfys/daily/<file>.sql.gz
bash deploy/scripts/rollback.sh meili
bash deploy/scripts/rollback.sh full <prev-tag> <backup-file>
```

详见 [ROLLBACK.md](ROLLBACK.md)。

---

## 📌 后续 Roadmap

(优先级 = 用户体验 > 运营效率 > 性能)

- [ ] GA4 接入 + DailyStat 自动写入
- [ ] OAuth（微信 / GitHub / Google）
- [ ] 邮件激活 / 找回密码
- [ ] 移动端响应式优化（当前桌面优先）
- [ ] 评论嵌套回复 + 点赞 + @
- [ ] FFZY 备用域名（外部联系/自建镜像）
- [ ] 拼音搜索预处理脚本（pinyin-pro 离线索引）
- [ ] 推荐冷启动改进（接入用户行为数据后）
- [ ] Cloudflare 接入文档落地
- [ ] 移动端 PWA / iOS App

---

## 🙏 致谢

- 资源站接口：FFZY / LZZY / BFZY（公开苹果 CMS V10 接口）
- 播放器：ArtPlayer + HLS.js（开源）
- 搜索引擎：Meilisearch（MIT）
- UI 参考：Vercel Dashboard / Linear / Plausible
- 框架：Next.js / NestJS / Prisma

---

**🎬 Have a hurricane of a watch.**
