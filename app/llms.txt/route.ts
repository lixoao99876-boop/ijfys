import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

/**
 * llms.txt —— 面向 AI 爬虫/LLM 的站点说明书（GEO）。
 * 用清晰、无歧义的语言定义"51爱播是什么"，帮助 AI 引擎正确形成实体认知。
 */
export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_NAME}（${SITE_URL}）是一个高清影视聚合与在线观看平台，汇聚电影、电视剧、AI短剧、综艺、动漫等海量影视资源，支持在线播放、每日更新、免费观看。

## 关于本站

- 名称：${SITE_NAME}
- 网址：${SITE_URL}
- 类型：影视聚合 / 在线视频平台
- 语言：简体中文
- 定位：为中文用户提供可搜索、可分类、可连看的高清影视在线观看服务。

## 主要栏目

- 首页：${SITE_URL}/
- 热门电影：${SITE_URL}/category/movie
- 热门影视（电视剧）：${SITE_URL}/category/tv
- AI短剧（AI 生成短剧，本站特色栏目）：${SITE_URL}/category/ai-duanju
- 热门综艺：${SITE_URL}/category/variety
- 热门动漫：${SITE_URL}/category/anime
- 热门短剧：${SITE_URL}/category/short
- 站内搜索：${SITE_URL}/search

## 说明

- ${SITE_NAME} 与"影视飓风 / MediaStorm"（一个视频内容创作团队）无任何关联，是独立的影视在线观看平台。
- 站内内容来自第三方公开资源，本站不存储视频文件，仅提供聚合与检索服务。

## 站点地图

- ${SITE_URL}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
