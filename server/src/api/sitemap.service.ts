import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** 每个 sitemap 分片的 URL 上限（用户定：5000） */
const SHARD_LIMIT = 5000;

interface UrlEntry {
  loc: string;
  lastmod?: Date | null;
  changefreq?: string;
  priority?: number;
  image?: { loc: string; title?: string } | null; // 图片 sitemap（封面海报）
}

const STATIC_ROUTES: Array<{ path: string; priority: number; changefreq: string }> = [
  { path: "/", priority: 1.0, changefreq: "hourly" },
  { path: "/category/movie", priority: 0.9, changefreq: "daily" },
  { path: "/category/tv", priority: 0.9, changefreq: "daily" },
  { path: "/category/anime", priority: 0.8, changefreq: "daily" },
  { path: "/category/variety", priority: 0.8, changefreq: "daily" },
  { path: "/category/short", priority: 0.7, changefreq: "daily" },
  { path: "/category/ai-duanju", priority: 0.9, changefreq: "daily" },
  { path: "/actor", priority: 0.6, changefreq: "weekly" },
  { path: "/article", priority: 0.6, changefreq: "daily" },
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  private get siteUrl(): string {
    return (process.env.PUBLIC_SITE_URL ?? "https://aiskill88.xyz").replace(/\/+$/, "");
  }

  /** sitemap index：列出全部分片。分片按 5000/个切，条数变化时自动增减 */
  async buildIndex(): Promise<string> {
    const [videoCount, articleCount, actorCount] = await Promise.all([
      this.prisma.video.count({ where: { status: "PUBLISHED" } }),
      this.prisma.article.count(),
      this.prisma.actor.count(),
    ]);

    const files: string[] = ["static.xml"];
    for (let i = 1; i <= Math.ceil(videoCount / SHARD_LIMIT); i++) files.push(`videos-${i}.xml`);
    for (let i = 1; i <= Math.ceil(articleCount / SHARD_LIMIT); i++) files.push(`articles-${i}.xml`);
    for (let i = 1; i <= Math.ceil(actorCount / SHARD_LIMIT); i++) files.push(`actors-${i}.xml`);

    const now = new Date().toISOString();
    const items = files
      .map((f) => `  <sitemap><loc>${this.siteUrl}/sitemaps/${f}</loc><lastmod>${now}</lastmod></sitemap>`)
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
  }

  /** 单个分片。name 形如 static.xml / videos-2.xml */
  async buildShard(name: string): Promise<string> {
    const m = /^(static|videos|articles|actors)(?:-(\d+))?\.xml$/.exec(name);
    if (!m) throw new NotFoundException("unknown sitemap");
    const kind = m[1];
    const page = Math.max(1, parseInt(m[2] ?? "1", 10));
    const skip = (page - 1) * SHARD_LIMIT;

    let entries: UrlEntry[];
    switch (kind) {
      case "static":
        entries = STATIC_ROUTES.map((r) => ({
          loc: `${this.siteUrl}${r.path}`,
          lastmod: new Date(),
          changefreq: r.changefreq,
          priority: r.priority,
        }));
        break;
      case "videos": {
        const rows = await this.prisma.video.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, updatedAt: true, cover: true, title: true },
          orderBy: { createdAt: "asc" },
          skip,
          take: SHARD_LIMIT,
        });
        entries = rows.map((v) => ({
          loc: `${this.siteUrl}/vod/${v.id}`,
          lastmod: v.updatedAt,
          changefreq: "daily",
          priority: 0.7,
          // 封面海报进图片 sitemap（利于 Google 图片收录）
          image: v.cover && /^https?:\/\//.test(v.cover) ? { loc: v.cover, title: v.title } : null,
        }));
        break;
      }
      case "articles": {
        const rows = await this.prisma.article.findMany({
          select: { id: true, sourceUpdatedAt: true, updatedAt: true },
          orderBy: { createdAt: "asc" },
          skip,
          take: SHARD_LIMIT,
        });
        entries = rows.map((a) => ({
          loc: `${this.siteUrl}/article/${a.id}`,
          lastmod: a.sourceUpdatedAt ?? a.updatedAt,
          changefreq: "weekly",
          priority: 0.5,
        }));
        break;
      }
      case "actors": {
        const rows = await this.prisma.actor.findMany({
          select: { id: true, updatedAt: true },
          orderBy: { createdAt: "asc" },
          skip,
          take: SHARD_LIMIT,
        });
        entries = rows.map((a) => ({
          loc: `${this.siteUrl}/actor/${a.id}`,
          lastmod: a.updatedAt,
          changefreq: "weekly",
          priority: 0.4,
        }));
        break;
      }
      default:
        throw new NotFoundException("unknown sitemap");
    }

    if (page > 1 && entries.length === 0) throw new NotFoundException("empty shard");

    let hasImage = false;
    const items = entries
      .map((e) => {
        const parts = [`<loc>${xmlEscape(e.loc)}</loc>`];
        if (e.lastmod) parts.push(`<lastmod>${e.lastmod.toISOString()}</lastmod>`);
        if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
        if (e.priority != null) parts.push(`<priority>${e.priority}</priority>`);
        if (e.image) {
          hasImage = true;
          parts.push(
            `<image:image><image:loc>${xmlEscape(e.image.loc)}</image:loc>` +
              (e.image.title ? `<image:title>${xmlEscape(e.image.title)}</image:title>` : "") +
              `</image:image>`,
          );
        }
        return `  <url>${parts.join("")}</url>`;
      })
      .join("\n");
    const imageNs = hasImage ? ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` : "";
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}>\n${items}\n</urlset>\n`;
  }
}
