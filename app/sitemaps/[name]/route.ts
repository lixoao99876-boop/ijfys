import { NextResponse } from "next/server";

const API_BASE =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const revalidate = 3600;

const NAME_RE = /^(static|videos|articles|actors)(?:-\d+)?\.xml$/;

/** /sitemaps/videos-1.xml 等分片 → 反代后端 */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!NAME_RE.test(name)) return new NextResponse("not found", { status: 404 });
  try {
    const res = await fetch(`${API_BASE}/sitemap/${name}`, { next: { revalidate: 3600 } });
    if (!res.ok) return new NextResponse("not found", { status: res.status });
    const xml = await res.text();
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("sitemap unavailable", { status: 503 });
  }
}
