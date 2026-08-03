import Link from "next/link";
import { listActors } from "@/lib/api";
import { SITE_NAME } from "@/lib/site";

export const metadata = { title: `演员库 - ${SITE_NAME}` };

export default async function ActorListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string) || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 24;
  const res = await listActors({ q, page, limit });
  const pageCount = Math.max(1, Math.ceil(res.total / limit));

  function pageHref(p: number) {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    usp.set("page", String(p));
    return `/actor?${usp.toString()}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">演员库</h1>
      <p className="text-sm text-muted mb-4">共 {res.total.toLocaleString()} 位演员</p>
      <form action="/actor" className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索演员姓名..."
          className="w-full max-w-sm h-9 px-3 rounded-md bg-surface2 border border-white/10 text-sm focus:border-primary/40 focus:outline-none"
        />
      </form>

      {res.items.length === 0 ? (
        <div className="text-center text-muted py-20 text-sm">无匹配结果</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {res.items.map((a) => (
            <Link
              key={a.id}
              href={`/actor/${a.id}`}
              className="group block"
            >
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-surface2 border border-white/5 group-hover:border-white/20 transition">
                {a.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover} alt={a.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-muted">
                    {a.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm text-text truncate">{a.name}</div>
                <div className="text-[10px] text-muted">
                  {[a.sex, a.area].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

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
