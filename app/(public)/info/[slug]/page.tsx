import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSitePage } from "@/lib/api";
import { renderContent } from "@/lib/render-content";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getSitePage(slug);
  if (!page) return {};
  const canonical = `${SITE_URL}/info/${slug}`;
  return {
    title: `${page.title} - ${SITE_NAME}`,
    description: page.summary ?? `${SITE_NAME}${page.title}`,
    alternates: { canonical },
    openGraph: { title: `${page.title} - ${SITE_NAME}`, url: canonical, type: "article" },
  };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getSitePage(slug);
  if (!page) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <nav aria-label="面包屑" className="text-xs text-muted mb-3">
        <Link href="/" className="hover:text-text">首页</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text">{page.title}</span>
      </nav>
      <h1 className="text-2xl md:text-3xl font-bold mb-2">{page.title}</h1>
      <p className="text-xs text-muted mb-6">
        更新于 {new Date(page.updatedAt).toLocaleDateString("zh-CN")}
      </p>
      <article
        className="info-content text-[15px] leading-[1.85] text-text/85"
        dangerouslySetInnerHTML={{ __html: renderContent(page.body) }}
      />
      <style>{`
        .info-content h2{font-size:20px;font-weight:700;color:#fff;margin:28px 0 12px}
        .info-content h3{font-size:16.5px;font-weight:700;color:#fff;margin:22px 0 10px}
        .info-content p{margin:12px 0}
        .info-content ul{padding-left:22px;margin:12px 0;list-style:disc}
        .info-content li{margin:6px 0}
        .info-content strong{font-weight:700;color:#fff}
      `}</style>
    </div>
  );
}
