# 飓风影视 资源中台（NestJS + Prisma + PostgreSQL）

苹果 CMS V10 标准接口爬取 + 多资源站去重 + 多线路评分 + REST API。

> 前端 (`/Users/mac/ijfys`) UI 与播放器零修改，只把数据源从 `lib/mock/videos.ts` 切到 `lib/api/index.ts`，后者打到本服务 `/api/*`。

---

## 0. 一次性环境准备

```bash
# Postgres（本地）
brew install postgresql@16 && brew services start postgresql@16
createuser -s ijfys
createdb -O ijfys ijfys

# 依赖
cd /Users/mac/ijfys/server
cp .env.example .env
pnpm install
pnpm db:generate          # 生成 Prisma Client
pnpm db:migrate --name init   # 落地 6 张表
pnpm db:seed              # 把 ffzy/lzzy/bfzy 写入 providers 表
```

可调 `.env`：

```env
DATABASE_URL=postgresql://ijfys:ijfys@localhost:5432/ijfys
PORT=4000
PROVIDER_FFZY_BASE_URL=https://api.ffzy5.tv/api.php/provide/vod
PROVIDER_LZZY_BASE_URL=https://cj.lziapi.com/api.php/provide/vod
PROVIDER_BFZY_BASE_URL=https://bfzyapi.com/api.php/provide/vod
SYNC_INCREMENTAL_CRON=*/10 * * * *
SYNC_PAGES_PER_RUN=10
SYNC_HOURS_BACK=1
```

---

## 1. 跑首次全量

```bash
pnpm sync:full                    # 三个站全量
pnpm sync --full --provider=ffzy  # 只跑非凡资源
pnpm sync --full --pages=5        # 每个站只抓 5 页（调试用）
```

完成后会自动跑一次 `ScoringService.scoreAll()`，给每个 source 算 0–100 分。

---

## 2. 启动 API（含每 10 分钟增量 cron）

```bash
pnpm dev                          # 开发模式
pnpm build && pnpm start          # 生产

# 接口
curl http://localhost:4000/api/home | jq .
curl http://localhost:4000/api/search?q=三体 | jq .
curl http://localhost:4000/api/video/<id> | jq .
curl http://localhost:4000/api/play/<episodeId> | jq .
```

cron `*/10 * * * *` 由 `@nestjs/schedule` 装入；上一轮未结束本轮自动跳过。

手动触发增量：

```bash
pnpm sync:inc                     # 与 cron 等价
pnpm sync --inc --hours=6         # 抓最近 6 小时变化
```

---

## 3. 前端如何对接

前端 `lib/api/index.ts` 默认指向 `http://localhost:4000/api`，可通过 `NEXT_PUBLIC_API_URL`（浏览器）或 `API_URL`（server component）覆盖。

启动前端：

```bash
cd /Users/mac/ijfys
pnpm dev    # http://localhost:3000
```

---

## 4. 同步流程图

```
┌──────────────────────────────────────────────────────────────┐
│  cron @ */10 * * * *           CLI: pnpm sync [--full|--inc] │
│             │                              │                 │
│             └──────────────┬───────────────┘                 │
│                            ▼                                 │
│                    CrawlerService.runAll                     │
│                            │                                 │
│           ┌────────────────┼────────────────┐                │
│           ▼                ▼                ▼                │
│      FfzyProvider     LzzyProvider     BfzyProvider          │
│      fetchPage()      fetchPage()      fetchPage()           │
│      (axios → CMS)                                           │
│           │                                                  │
│           ▼ NormalizedVod[]                                  │
│      BaseAppleCmsProvider.normalize                          │
│       · parsePlay (vod_play_from / vod_play_url)             │
│       · detectCategory / detectQuality                       │
│       · 去 HTML、过滤无 m3u8 项                              │
│           │                                                  │
│           ▼                                                  │
│      upsertVod ($transaction)                                │
│       1. video.upsert(by externalKey = 标题|年|类)            │
│       2. episode.upsert(videoId, index) — 按最长源扩展        │
│       3. source.upsert(videoId, providerId, playFromCode)    │
│       4. sourceEpisode.upsert(sourceId, episodeId)           │
│           │                                                  │
│           ▼                                                  │
│      ScoringService.scoreVideo                               │
│       可播放 + 集数覆盖率 + 画质 + 更新速度 - 失效              │
│       → source.score (0~100)                                 │
│           │                                                  │
│           ▼                                                  │
│      syncLog (RUNNING → SUCCESS/FAILED)                      │
│      provider.lastSyncAt = now()                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 数据模型（6 表速览）

| 表 | 关键字段 | 说明 |
|---|---|---|
| `providers` | `code`(UNIQUE), name, baseUrl, status, weight | 资源站清单 |
| `videos` | `externalKey`(UNIQUE = title\|year\|cat), category, year, cover, score | 去重后的唯一作品 |
| `episodes` | `(videoId, index)` UNIQUE, name | 该视频的正典剧集表 |
| `sources` | `(videoId, providerId, playFromCode)` UNIQUE, quality, totalEpisodes, **score**, failureCount | 每个 provider × video × 播放源 |
| `source_episodes` | `(sourceId, episodeId)` UNIQUE, m3u8Url, isValid | 每集真实 m3u8 |
| `sync_logs` | providerId, type, status, addedCount, durationMs, errorMessage | 同步运行历史 |

---

## 6. 评分规则（满分 100）

| 维度 | 上限 | 说明 |
|---|---|---|
| 可播放性 | +30 | isActive=true 且 failureCount<3 |
| 集数覆盖率 | +25 | 本源集数 / 该视频最大集数 |
| 画质 | +22 | 4K:22 / 1080P:20 / 原画:15 / 720P:12 / 其他:5 |
| 更新速度 | +15 | source 与 video 时间差 ≤1d:15 / ≤3d:10 / ≤7d:6 / ≤30d:3 |
| 失效惩罚 | -25 | failureCount × 5（封顶 -25） |
| 站权重 | × | `provider.weight / 100`（默认 1，可手动加权） |

`/api/play/:episodeId` 返回的 sources 按 score 倒序，第一条标 `best:true`。
前端可调用 `POST /api/play/:sourceId/failed` / `/ok` 实时上报。

---

## 7. REST 接口

| Path | 用途 | 关键参数 |
|---|---|---|
| `GET /api/home` | 首页聚合 | — |
| `GET /api/search?q=` | 全文搜索（title/originalTitle/director/actors[]/genres[]） | q |
| `GET /api/videos?category=&genre=&region=&year=&sort=` | 分类列表 + 筛选 | category=movie/tv/anime/variety/short, sort=latest/score/year |
| `GET /api/filters?category=` | 该分类下可用筛选项 | category |
| `GET /api/video/:id` | 详情 + 推荐 | id |
| `GET /api/play/:episodeId` | 单集播放（多线路排序） | episodeId |
| `POST /api/play/:sourceId/failed` | 线路播放失败上报 | sourceId |
| `POST /api/play/:sourceId/ok` | 线路播放成功上报 | sourceId |

---

## 8. 项目目录

```
server/
├── prisma/
│   └── schema.prisma                # 6 表 schema
├── src/
│   ├── main.ts                      # bootstrap
│   ├── app.module.ts                # 装载所有模块
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── apple-cms/                   # 通用 CMS V10 客户端 + 解析
│   │   ├── apple-cms.types.ts
│   │   ├── apple-cms.client.ts
│   │   └── apple-cms.parser.ts
│   ├── providers/                   # 资源站适配器
│   │   ├── provider.interface.ts
│   │   ├── base-apple-cms.provider.ts
│   │   ├── ffzy.provider.ts         # 非凡资源
│   │   ├── lzzy.provider.ts         # 量子资源
│   │   ├── bfzy.provider.ts         # 暴风资源
│   │   └── providers.module.ts
│   ├── crawler/                     # 同步引擎
│   │   ├── crawler.service.ts       # 全量/增量 + cron + upsert
│   │   └── crawler.module.ts
│   ├── scoring/                     # 评分
│   │   ├── scoring.service.ts
│   │   └── scoring.module.ts
│   ├── api/                         # REST
│   │   ├── api.controller.ts
│   │   ├── api.service.ts
│   │   ├── api.module.ts
│   │   └── video.mapper.ts          # DB → 前端 Video DTO
│   └── cli/
│       ├── sync.ts                  # pnpm sync 入口
│       └── seed-providers.ts        # pnpm db:seed 入口
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example
└── README.md
```

---

## 9. 接入新资源站（红牛 / 极速 …）30 行示例

```ts
// src/providers/hnzy.provider.ts
import { Injectable } from "@nestjs/common";
import { BaseAppleCmsProvider } from "./base-apple-cms.provider";

@Injectable()
export class HnzyProvider extends BaseAppleCmsProvider {
  readonly code = "hnzy";
  readonly name = "红牛资源";
  readonly baseUrl = process.env.PROVIDER_HNZY_BASE_URL ?? "https://www.hongniuzy2.com/api.php/provide/vod";
}
```

`providers.module.ts` 把它加进 `providers` 数组 + 出口即可：sync / score / API 自动包含。

---

## 10. 开发步骤（落地顺序）

1. `brew install postgresql@16` 并 `createdb ijfys`
2. `cd server && cp .env.example .env && pnpm install`
3. `pnpm db:generate && pnpm db:migrate --name init && pnpm db:seed`
4. `pnpm sync --full --pages=3` —— 抓 3 页验证字段无误
5. `pnpm dev` —— 起 API + cron
6. `cd .. && pnpm dev` —— 起前端 → http://localhost:3000
7. 没问题后改 `SYNC_PAGES_PER_RUN`/`SYNC_HOURS_BACK` 进入稳定运行
8. 后期：补 `/api/play/:sourceId/failed` 上报、`m3u8` 健康巡检 cron
