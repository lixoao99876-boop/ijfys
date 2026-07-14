import { NextResponse } from "next/server";

const API_BASE =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const revalidate = 3600;

/** /sitemap.xml → 后端生成的 sitemap index（分片列表） */
export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/sitemap/index.xml`, { next: { revalidate: 3600 } });
    if (!res.ok) return new NextResponse("sitemap unavailable", { status: 503 });
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
