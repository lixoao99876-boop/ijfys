import { NextResponse } from "next/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ijfys.com";
const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const revalidate = 600;

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  let items: Array<{ id: string; title: string; description: string; link: string; pubDate: string; category?: string }> = [];

  try {
    const home = await fetch(`${API_BASE}/home`, { next: { revalidate: 600 } }).then((r) => (r.ok ? r.json() : null));
    if (home?.recent) {
      items = home.recent.map((v: { id: string; title: string; description?: string; updatedAt?: string; category?: string }) => ({
        id: v.id,
        title: v.title,
        description: (v.description ?? "").slice(0, 300),
        link: `${SITE}/vod/${v.id}`,
        pubDate: new Date(v.updatedAt ?? Date.now()).toUTCString(),
        category: v.category,
      }));
    }
  } catch {
    /* noop */
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>飓风影视 - 最新更新</title>
    <link>${SITE}</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>飓风影视：电影、剧集、综艺、动漫、短剧高清在线观看</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items
      .map(
        (it) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="true">${esc(it.link)}</guid>
      <pubDate>${it.pubDate}</pubDate>
      ${it.category ? `<category>${esc(it.category)}</category>` : ""}
      <description><![CDATA[${it.description}]]></description>
    </item>`,
      )
      .join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
