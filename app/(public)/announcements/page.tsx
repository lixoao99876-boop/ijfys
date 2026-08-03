import type { Metadata } from "next";
import Link from "next/link";
import { listAnnouncements } from "@/lib/api";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `最新公告 - ${SITE_NAME}`,
  description: `${SITE_NAME}最新公告与站点通知。`,
  alternates: { canonical: `${SITE_URL}/announcements` },
};

export default async function AnnouncementsPage() {
  let items: { slug: string; title: string; summary: string | null; updatedAt: string }[] = [];
  try {
    items = await listAnnouncements();
  } catch {
    items = [];
  }

  return (
    <div className="max-w-3xl mx-auto">
      <nav aria-label="面包屑" className="text-xs text-muted mb-3">
        <Link href="/" className="hover:text-text">首页</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text">最新公告</span>
      </nav>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">最新公告</h1>

      {items.length === 0 ? (
        <p className="text-muted text-sm">暂无公告。</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Link
              key={a.slug}
              href={`/info/${a.slug}`}
              className="block bg-surface/40 border border-white/5 rounded-xl p-4 hover:border-white/15 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{a.title}</span>
                <span className="text-xs text-muted shrink-0">
                  {new Date(a.updatedAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
              {a.summary && <p className="text-sm text-muted mt-1.5 line-clamp-2">{a.summary}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
