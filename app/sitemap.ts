import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ijfys.com";
const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1.0, changeFrequency: "hourly" },
  { path: "/category/movie", priority: 0.9, changeFrequency: "hourly" },
  { path: "/category/tv", priority: 0.9, changeFrequency: "hourly" },
  { path: "/category/anime", priority: 0.8, changeFrequency: "daily" },
  { path: "/category/variety", priority: 0.8, changeFrequency: "daily" },
  { path: "/category/short", priority: 0.7, changeFrequency: "daily" },
  { path: "/actor", priority: 0.6, changeFrequency: "weekly" },
  { path: "/article", priority: 0.6, changeFrequency: "daily" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // 加最新 2000 条视频 / 500 文章 / 500 演员
  try {
    const [vids, arts, actors] = await Promise.all([
      fetch(`${API_BASE}/videos?category=movie&limit=500`, { next: { revalidate: 3600 } }).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/articles?limit=200`, { next: { revalidate: 3600 } }).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/actors?limit=200`, { next: { revalidate: 3600 } }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);
    if (vids?.items) {
      out.push(
        ...vids.items.map((v: { id: string; updatedAt?: string }) => ({
          url: `${SITE}/vod/${v.id}`,
          lastModified: v.updatedAt ? new Date(v.updatedAt) : now,
          changeFrequency: "daily" as const,
          priority: 0.7,
        })),
      );
    }
    if (arts?.items) {
      out.push(
        ...arts.items.map((a: { id: string; sourceUpdatedAt?: string }) => ({
          url: `${SITE}/article/${a.id}`,
          lastModified: a.sourceUpdatedAt ? new Date(a.sourceUpdatedAt) : now,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        })),
      );
    }
    if (actors?.items) {
      out.push(
        ...actors.items.map((a: { id: string }) => ({
          url: `${SITE}/actor/${a.id}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.4,
        })),
      );
    }
  } catch {
    /* sitemap 拉取失败时只输出静态路由，不阻塞 */
  }

  return out;
}
