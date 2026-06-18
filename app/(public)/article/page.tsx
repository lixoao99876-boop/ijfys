import Link from "next/link";
import { listArticles } from "@/lib/api";

export const metadata = { title: "影视资讯 - 飓风影视" };

export default async function ArticleListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string) || "";
  const type = (sp.type as string) || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 20;
  const res = await listArticles({ q, type, page, limit });
  const pageCount = Math.max(1, Math.ceil(res.total / limit));

  function pageHref(p: number) {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (type) usp.set("type", type);
    usp.set("page", String(p));
    return `/article?${usp.toString()}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">影视资讯</h1>
      <p className="text-sm text-muted mb-4">共 {res.total.toLocaleString()} 篇资讯</p>

      <ul className="divide-y divide-white/5">
        {res.items.map((a) => (
          <li key={a.id} className="py-4">
            <Link href={`/article/${a.id}`} className="flex gap-4 group">
              {a.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.cover} alt="" className="w-32 h-20 object-cover rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-text group-hover:text-accent line-clamp-2 mb-1">
                  {a.title}
                </h2>
                {a.blurb && <p className="text-sm text-muted line-clamp-2">{a.blurb}</p>}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                  {a.typeName && <span className="text-indigo-300">{a.typeName}</span>}
                  {a.author && <span>{a.author}</span>}
                  {a.sourceUpdatedAt && <span className="tabular-nums">{new Date(a.sourceUpdatedAt).toLocaleDateString("zh-CN")}</span>}
                  <span>· {a.hits} 阅读</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 text-sm">
          {page > 1 && <Link href={pageHref(page - 1)} className="px-3 py-1 rounded border border-white/10 hover:border-white/30">上一页</Link>}
          <span className="text-muted">第 {page} / {pageCount} 页</span>
          {page < pageCount && <Link href={pageHref(page + 1)} className="px-3 py-1 rounded border border-white/10 hover:border-white/30">下一页</Link>}
        </div>
      )}
    </div>
  );
}
