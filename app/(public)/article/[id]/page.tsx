import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleDetail } from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getArticleDetail(id);
  if (!data) return { title: "资讯不存在" };
  const { article } = data;
  const desc = (article.blurb ?? article.title).slice(0, 140);
  return {
    title: `${article.title} - 飓风影视资讯`,
    description: desc,
    keywords: [article.title, article.typeName, "影视资讯"].filter(Boolean).join(", "),
    openGraph: {
      title: article.title,
      description: desc,
      images: article.cover ? [article.cover] : [],
      type: "article",
      authors: article.author ? [article.author] : [],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const data = await getArticleDetail(id);
  if (!data) notFound();
  const { article, prev, next, related } = data;

  return (
    <article className="max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            image: article.cover,
            datePublished: article.sourceUpdatedAt,
            author: article.author ? { "@type": "Person", name: article.author } : undefined,
            publisher: { "@type": "Organization", name: "飓风影视" },
            description: article.blurb,
          }),
        }}
      />

      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-muted mb-2">
          {article.typeName && (
            <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/25 text-indigo-300">
              {article.typeName}
            </span>
          )}
          {article.author && <span>{article.author}</span>}
          {article.sourceUpdatedAt && (
            <span className="tabular-nums">{new Date(article.sourceUpdatedAt).toLocaleDateString("zh-CN")}</span>
          )}
          <span className="text-muted/70">· {article.hits} 阅读</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-text leading-tight">{article.title}</h1>
        {article.subtitle && <p className="mt-2 text-sm text-muted">{article.subtitle}</p>}
      </div>

      {article.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover}
          alt={article.title}
          className="w-full rounded-xl border border-white/5 mb-6 max-h-[420px] object-cover"
        />
      )}

      <div className="prose prose-invert prose-sm md:prose-base max-w-none text-text/90 leading-relaxed">
        {article.content ? (
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        ) : article.blurb ? (
          <p className="whitespace-pre-wrap">{article.blurb}</p>
        ) : (
          <p className="text-muted">本文无正文内容</p>
        )}
      </div>

      {article.jumpUrl && (
        <p className="mt-6 text-xs text-muted">
          原文链接：{" "}
          <a href={article.jumpUrl} target="_blank" rel="noopener" className="text-accent hover:underline break-all">
            {article.jumpUrl}
          </a>
        </p>
      )}

      <nav className="mt-10 grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
        <div>
          {prev && (
            <Link href={`/article/${prev.id}`} className="block group">
              <div className="text-xs text-muted mb-1">← 上一篇</div>
              <div className="text-sm text-text group-hover:text-accent line-clamp-2">{prev.title}</div>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link href={`/article/${next.id}`} className="block group">
              <div className="text-xs text-muted mb-1">下一篇 →</div>
              <div className="text-sm text-text group-hover:text-accent line-clamp-2">{next.title}</div>
            </Link>
          )}
        </div>
      </nav>

      {related.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 bg-primary rounded-full" />
            <h2 className="text-base font-semibold">相关推荐</h2>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/article/${r.id}`} className="flex gap-3 rounded-lg p-2 hover:bg-white/[0.03]">
                  {r.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover} alt="" className="w-20 h-14 object-cover rounded shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-text line-clamp-2">{r.title}</div>
                    <div className="text-[10px] text-muted mt-1">
                      {r.typeName} · {r.sourceUpdatedAt && new Date(r.sourceUpdatedAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
