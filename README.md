# 飓风影视 · ijfys.com

参考爱壹帆 / ylsp.tv 的现代影视站前端脚手架。基于 **Next.js 15 (App Router) + TypeScript + TailwindCSS + ArtPlayer + HLS.js + Zustand**。

> 当前阶段只用 mock 数据 + 公开测试 m3u8 流，未接入任何真实版权资源。

---

## 1. 项目启动

```bash
cd /Users/mac/ijfys
pnpm install        # 已安装可跳过；node 18+ 即可
pnpm dev            # 启动 dev server
# 打开 http://localhost:3000
```

其他脚本：

```bash
pnpm typecheck      # tsc --noEmit
pnpm build && pnpm start
```

> 本机环境没有 pnpm，可以用 `npm i -g pnpm --prefix=$HOME/.npm-global`，把 `$HOME/.npm-global/bin` 加进 PATH。已用同样方式装好并验证。

---

## 2. 页面路径

| 路径                              | 说明                            |
| --------------------------------- | ------------------------------- |
| `/`                               | 首页，Banner 轮播 + 多分类横向列表 |
| `/category/[type]`                | 分类页，支持 类型/地区/年份/排序 筛选 |
| `/category/movie`                 | 电影                            |
| `/category/tv`                    | 剧集                            |
| `/category/anime`                 | 动漫                            |
| `/category/variety`               | 综艺                            |
| `/category/short`                 | 短剧                            |
| `/vod/[id]`                       | 详情页（海报/简介/线路/剧集/推荐） |
| `/play/[id]/[episode]`            | 播放页（播放器 + 线路 + 剧集 + 推荐） |
| `/search?q=...`                   | 搜索页（含热门搜索词）              |
| `/history`                        | 观看历史（localStorage 持久化）      |

样例数据：首页/详情页可点 `星海征途` (`v0001`)、`长安十二时辰 2` (`v0009`)、`咒术回战 第三季` (`v0017`) 等。

---

## 3. 接入真实资源站 API（后续）

当前架构已经把"数据访问"集中在 `lib/mock/videos.ts`，只暴露这几个函数给页面：

```ts
getVideoById(id)
getVideosByCategory(category)
getRecentVideos(limit)
getTopRated(limit)
getBannerVideos(limit)
searchVideos(keyword)
getRecommendations(video, limit)
listGenres / listRegions / listYears
```

**接入步骤建议：**

1. 新建 `lib/api/` 目录，封装资源站请求（CMS / 苹果 CMS V10 / 飞鸽 API 等），统一返回 `Video` 类型（见 `lib/types.ts`）。
2. 写一份适配层 `lib/api/adapter.ts`，把第三方字段映射成本项目的 `Video / Source / Episode` 结构（重点是 `sources[].episodes[].m3u8Url`）。
3. 把页面的 `import { ... } from "@/lib/mock/videos"` 平替为 `from "@/lib/api"`（保持同名导出），即可无缝切换。
4. 服务端组件中可直接 `await fetch(...)`；如需 ISR/缓存，可用 Next 15 `fetch` 的 `next: { revalidate: 600 }` 选项或 `unstable_cache`。
5. 详情/播放页改成走 `revalidate` 而不是 `force-dynamic`，可显著提升性能。
6. 需要后台管理资源源时，再加 `app/admin/` + 鉴权 + DB。

---

## 4. 播放器相关文件

| 文件                                                | 说明                                              |
| --------------------------------------------------- | ------------------------------------------------- |
| `components/player/VideoPlayer.tsx`                 | **核心播放器组件**，ArtPlayer + HLS.js 动态加载，封装了 m3u8 customType、timeupdate/ended/error 事件 |
| `app/play/[id]/[episode]/PlayClient.tsx`            | 播放页客户端容器：线路切换、下一集、错误提示、历史写入 |
| `app/play/[id]/[episode]/page.tsx`                  | 播放页 server entry（异步 params） |
| `components/video/SourceTabs.tsx`                   | 多线路切换 UI，失败线路打 ×                       |
| `components/video/EpisodeList.tsx`                  | 剧集网格（自适应分集 vs 整数序号）                |
| `stores/playerStore.ts`                             | 失败线路集合 / 当前线路 / 当前剧集                |
| `stores/historyStore.ts`                            | 观看历史 zustand persist → `localStorage`        |
| `app/globals.css`                                   | ArtPlayer 主题色覆写（进度条红色 / 缓冲紫色）       |

**当前测试 m3u8**（三条公开稳定流，已在 `lib/mock/videos.ts` 的 `TEST_STREAMS` 数组中）：

- `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`
- `https://test-streams.mux.dev/test_001/stream.m3u8`
- `https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8`

每个 source / episode 轮询使用，演示多线路切换。

---

## 5. Mock 数据相关文件

| 文件                  | 说明                                                                       |
| --------------------- | -------------------------------------------------------------------------- |
| `lib/types.ts`        | `Video / Episode / Source / SourceEpisode / HistoryItem / Category` 类型 |
| `lib/mock/videos.ts`  | **40 部 mock 影片**（电影/剧集/动漫/综艺/短剧 各 8 部），含工具函数 |
| `lib/utils.ts`        | `cn / formatTime / formatRelative` 通用工具                                 |

每部影片字段贴近苹果 CMS V10，可平移到真实数据：

```ts
{
  id, title, originalTitle,
  category,                       // movie | tv | anime | variety | short
  cover, backdrop,                // 2:3 海报 + 16:9 背景图（picsum 占位）
  year, region, genres, actors, director, description,
  remarks, score, updatedAt,
  episodes: [{ episodeId, name, index }],
  sources:  [{ sourceId, sourceName, lineName, quality, episodes: [{ episodeId, m3u8Url }] }]
}
```

---

## 6. 目录结构

```
ijfys/
├── app/
│   ├── layout.tsx                  # 全局壳：MainLayout
│   ├── page.tsx                    # 首页
│   ├── globals.css                 # 暗黑主题 + Player 覆写
│   ├── category/[type]/
│   │   ├── page.tsx                # 分类页（server，读 searchParams）
│   │   └── FilterBar.tsx           # 类型/地区/年份/排序 筛选
│   ├── vod/[id]/page.tsx           # 详情页
│   ├── play/[id]/[episode]/
│   │   ├── page.tsx                # server entry
│   │   └── PlayClient.tsx          # 播放器 + 线路 + 剧集 + 推荐
│   ├── search/page.tsx             # 搜索页
│   └── history/page.tsx            # 观看历史
├── components/
│   ├── layout/{Sidebar,Header,MainLayout}.tsx
│   ├── video/{VideoCard,VideoGrid,EpisodeList,SourceTabs}.tsx
│   ├── player/VideoPlayer.tsx
│   ├── home/{HeroBanner,SectionRow}.tsx
│   └── search/SearchBox.tsx
├── lib/
│   ├── types.ts
│   ├── utils.ts
│   └── mock/videos.ts
├── stores/
│   ├── playerStore.ts
│   └── historyStore.ts
├── public/favicon.svg
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```
