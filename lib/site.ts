/**
 * 站点元信息（域名 / 品牌名）— 从环境变量读取，无硬编码
 *
 * 环境变量（必须在 .env / .env.production 中设置）：
 *   NEXT_PUBLIC_SITE_URL    公网根 URL（含 scheme），例 https://your-domain.com
 *   NEXT_PUBLIC_SITE_NAME   品牌名，例 "51爱播"
 *
 * 注意：必须用直接访问 `process.env.NEXT_PUBLIC_X` 才能让 Next.js / webpack
 * 在 build 时把它替换为字符串字面量。不能用 process.env[key] 动态访问，
 * 否则 client bundle 拿不到值。
 */

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const RAW_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME;

// 生产环境缺失立即报错（在 server 启动 / client hydration 时执行）
if (process.env.NODE_ENV === "production") {
  if (!RAW_SITE_URL) {
    // eslint-disable-next-line no-console
    console.error("[site] NEXT_PUBLIC_SITE_URL must be set in production");
  }
  if (!RAW_SITE_NAME) {
    // eslint-disable-next-line no-console
    console.error("[site] NEXT_PUBLIC_SITE_NAME must be set in production");
  }
}

export const SITE_URL: string = (RAW_SITE_URL && RAW_SITE_URL.trim()) || "http://localhost:3000";
export const SITE_NAME: string = (RAW_SITE_NAME && RAW_SITE_NAME.trim()) || "51爱播";

/** 品牌名两色拆分（logo 用）：前半普通色 + 后半强调色。按字符数中点拆，任意品牌名通用 */
const _mid = Math.ceil(SITE_NAME.length / 2);
export const SITE_NAME_HEAD: string = SITE_NAME.slice(0, _mid);
export const SITE_NAME_TAIL: string = SITE_NAME.slice(_mid);

/** 不带 scheme 的 host */
export const SITE_HOST: string = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** 默认社交分享图（OG/Twitter 兜底）· 规范 1200×630 · 见 public/social-default.jpg */
export const SOCIAL_IMAGE: string = `${SITE_URL}/social-default.jpg`;

/** 站点简介（GEO：给 AI 引擎一句清晰、无歧义的实体定义） */
export const SITE_DESCRIPTION = `${SITE_NAME}是一个高清影视聚合与在线观看平台，汇聚电影、电视剧、AI短剧、综艺、动漫等海量资源，支持在线播放、每日更新、免费观看。`;

/**
 * Organization + WebSite 实体图（GEO 核心）。首页注入，给搜索引擎/AI 一个可锚定的品牌实体。
 * logo 用横版全标 logo1；@id 用 URL 锚点便于图内互相引用。
 */
export function siteEntityLd() {
  const orgId = `${SITE_URL}/#organization`;
  const siteId = `${SITE_URL}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE_NAME,
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo1.png`, width: 200, height: 200 },
        image: `${SITE_URL}/logo2.png`,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "zh-CN",
        publisher: { "@id": orgId },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/** 生成 BreadcrumbList JSON-LD 对象（SD-06：末项绑定当前页绝对 URL） */
export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
