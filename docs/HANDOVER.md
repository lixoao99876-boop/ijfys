# 51爱播（51ibo.com）项目移交与运维文档

> 本文档面向接手本项目的技术团队，覆盖架构、部署、凭据、账号所有权转移、日常运维与已知坑。
> 文档日期：2026-08-03 · 交接状态：生产运行中（零停机迁移）

---

## 0. 一句话概览

51爱播是一个高清影视聚合与在线观看平台：**内容聚合**（对接第三方资源站）+ **SEO/GEO 驱动流量**（三大搜索引擎自动收录）+ **AI/自动化运营**（元数据补齐、提交、采集全托管）。前端 Next.js，后端 NestJS，数据 PostgreSQL + Meilisearch，单机 PM2 + Nginx 部署。

- 生产域名：**https://51ibo.com**（旧域名 aiskill88.xyz 全站 301 跳转至此）
- 代码仓库：`github.com/lixoao99876-boop/ijfys`（移交时转移所有权）
- 后台入口：`https://51ibo.com/console-3acn4viki5`（隐藏密径，移交后应更换）

---

## 1. 技术架构

| 层 | 技术 | 端口 | 说明 |
|---|---|---|---|
| 前端 | Next.js 15 (App Router) + Tailwind + Zustand | 3000 | SSR，SEO/GEO 友好 |
| 播放 | ArtPlayer + HLS.js | — | 多线路切换、失败自动降级 |
| 后端 | NestJS + Prisma | 4000 | API/采集/评分/补齐/SEO/后台 |
| 数据库 | PostgreSQL 16 | 5432 | 主库 |
| 搜索 | Meilisearch | 7700 | 站内检索（可重建） |
| 运维 | PM2 + Nginx + Let's Encrypt | 80/443 | 反代、HTTPS |

**进程（PM2）**：`ijfys-web`（前端 3000）、`ijfys-api`（后端 4000）、`ijfys-meili`（搜索 7700）。

**关键设计**：
- SSR 走内网直连 API（`API_URL=http://127.0.0.1:4000/api`），避开公网往返与限流。
- 后端绑定 `127.0.0.1`（`BIND_HOST`），外部只能经 Nginx。后台 API 靠 loopback + JWT 双重鉴权。
- 内容采集：多资源站 fail-over + 跨站去重（externalKey=归一化标题|年份）+ 五维线路评分 + cron 自愈。

---

## 2. 目录结构

```
ijfys/
├── app/                    Next.js 前端
│   ├── (public)/           公开页：首页/分类/详情/播放/搜索/资讯/信息页
│   ├── (admin)/console-*/  后台（密径路由 + (panel) 鉴权门禁 + login）
│   ├── llms.txt/ robots.ts sitemap.xml/  SEO/GEO 路由
├── components/             前端组件（layout/video/home/player/ui/admin）
├── lib/                    site.ts(品牌域名) / nav.ts / api / admin
├── server/                 NestJS 后端
│   ├── prisma/schema.prisma + migrations/
│   └── src/{apple-cms,providers,crawler,scoring,api,auth,admin,seo,sitepage,cli}
└── deploy/                 ecosystem.config.js + nginx + templates
```

---

## 3. 部署与构建

### 3.1 环境变量
- 后端：`server/.env`（参考 `server/.env.example`）— chmod 600
- 前端：`.env.production`（`NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_API_URL`，build 时烧入）

### 3.2 首次部署（新服务器）
```bash
# 1. 装依赖（pnpm）
pnpm install                          # 前端
cd server && pnpm install             # 后端

# 2. 建库 + 迁移
createdb ijfys
cd server && npx prisma migrate deploy && npx prisma generate

# 3. 构建
cd server && pnpm build               # → dist/
cd .. && pnpm build                   # → .next/  （需先配好 .env.production）

# 4. 起进程（PM2）
pm2 start server/dist/main.js --name ijfys-api --cwd server
API_URL=http://127.0.0.1:4000/api pm2 start node_modules/next/dist/bin/next \
   --name ijfys-web --cwd . -- start --port 3000
pm2 start meilisearch --name ijfys-meili
pm2 save

# 5. 建超管
cd server && ADMIN_USERNAME=xxx ADMIN_PASSWORD='强密码' ADMIN_ROLE=SUPER_ADMIN node dist/cli/create-admin.js

# 6. Nginx 反代 + certbot 证书（见 deploy/nginx）
```

### 3.3 日常更新部署
```bash
git pull
cd server && pnpm build && npx prisma migrate deploy    # 有 migration 时
cd .. && pnpm build
pm2 restart ijfys-api ijfys-web --update-env
```
⚠️ 前端 web 重启务必带 `API_URL=http://127.0.0.1:4000/api`（PM2 env）。
⚠️ web 不能用 `.bin/next` 启动（会崩），用 `node_modules/next/dist/bin/next`。

### 3.4 内容采集
```bash
cd server
pnpm sync:full        # 全量三站
pnpm sync:inc         # 增量（cron 每10分钟自动跑，无需手动）
```

---

## 4. 凭据清单（值不在本文档，见交接时单独提供的密钥表）

> 所有值存于 `server/.env`（生产机 chmod 600），**不入仓库**。移交时单独安全传递并**建议全部轮换**。

| 凭据 | 用途 | 移交动作 |
|---|---|---|
| `DATABASE_URL` | Postgres 连接 | 新服务器重设 |
| `JWT_SECRET` | 用户/后台登录签名 | **必须轮换**（否则旧 token 仍有效） |
| `MEILI_API_KEY` | 搜索引擎 | 重设 |
| `PROVIDER_*_BASE_URL` | 资源站采集接口 | 沿用（会变，配置化） |
| `TMDB_API_KEY` / `TMDB_READ_TOKEN` | 元数据补齐 | 公司申请自己的 |
| `INDEXNOW_KEY` | Bing 收录 | 公司重新生成 + 换 public/ key 文件 |
| `SC_SITE_URL` + Google OAuth（`GA4_OAUTH_*`） | GSC/GA4 | 公司重建 OAuth 应用 |
| `YANDEX_OAUTH_TOKEN` / `YANDEX_USER_ID` / `YANDEX_HOST_ID` | Yandex 收录 | 公司重新验证 |
| 后台超管密码 | 后台登录 | **轮换** |
| 后台密径 `console-*` | 后台入口 | **换新随机密径** |

---

## 5. 账号 / 所有权转移清单（移交实质，需账号持有人操作）

| 资产 | 当前归属 | 转移方式 |
|---|---|---|
| **域名 51ibo.com** | GoDaddy 个人账号 | 转移到公司账号 / 改所有者 |
| **GitHub 仓库** | lixoao99876-boop | Transfer 到公司组织 |
| **Google Search Console** | 个人 Google 账号 | 加公司为所有者，或公司重新验证 |
| **Google Analytics 4** | 同上（property 538368958） | 加公司管理员 / 迁移 |
| **Google OAuth 应用** | 个人 Google Cloud 项目 | 公司**重建自己的** OAuth 应用换掉 |
| **Bing Webmaster** | 个人账号 | 公司重新验证站点 |
| **Yandex Webmaster** | 个人账号 | 公司重新验证站点 |
| **TMDB API** | 个人账号 | 公司申请自己的 key |

---

## 6. 数据迁移

```bash
# 旧机导出
pg_dump -Fc ijfys > ijfys_$(date +%Y%m%d).dump
# 新机导入
pg_restore -d ijfys ijfys_YYYYMMDD.dump
```
Meilisearch 索引可在新机用后台「重建索引」或 `pnpm sync` 后重建，无需迁移。

---

## 7. 日常运维

| 事项 | 说明 |
|---|---|
| 内容更新 | cron 每 10 分钟增量采集，自动 |
| SEO 提交 | cron 每日自动向三大引擎提交（01:45–04:00） |
| 元数据补齐 | cron 每日补 TMDB |
| 证书续期 | certbot 自动续 |
| 日志 | `pm2 logs ijfys-api` / `pm2 logs ijfys-web` |
| 收录监控 | GSC / Bing / Yandex 后台看 sitemap 收录数 |
| 流量 | GA4（注意辨别真人 vs 爬虫：看来源/地理/落地页） |

---

## 8. 已知坑（务必读）

1. **前端 web 重启必带 `API_URL` 内网地址**，否则 SSR 走公网被限流。
2. **web 不能用 `.bin/next` 启动**，用 `node_modules/next/dist/bin/next -- start`。
3. **`NEXT_PUBLIC_*` 是 build 时烧入**，改域名/品牌名后必须**重新 build** 才生效。
4. **换域名会掉搜索引擎验证**：新域名要重新验证三引擎、旧域名全站 301、Google SC 用 `sc-domain:` 格式（非 URL 前缀）。
5. **cron 时区**：服务器若为 UTC，cron 表达式需显式 `timeZone: 'Asia/Shanghai'`。
6. **资源站 CDN 域名频繁变动**：暴风(bfzy)等老线路 m3u8 可能失效，需健康探测降权（待优化项，见 §9）。
7. **后台密径不能写进 robots.txt**（会泄露），靠鉴权 + noindex 保护。

---

## 9. 待优化项（交接时告知，非阻塞）

- **播放线路评分未全量跑**：99% 线路 score=0，导致线路排序近乎随机，死链可能排在前面（播放器会自动切换，但体验非最优）。建议加 m3u8 健康探测 cron，死链自动降权/隐藏。
- **社交分享图**已是 51爱播新图；其余视觉已全部更新。
- SEO 阶段 6（豆瓣兜底补齐 partial 内容）未做。

---

## 10. 品牌 / 域名可配置化

品牌名与域名已集中为单一配置，**换名/换域名只需改环境变量 + 重新 build**：
- 品牌名：`NEXT_PUBLIC_SITE_NAME`（`lib/site.ts` 读取）
- 域名：`NEXT_PUBLIC_SITE_URL` + 后端 `PUBLIC_SITE_URL` / `SC_SITE_URL` / `YANDEX_HOST_ID` / `CORS_ORIGINS`
