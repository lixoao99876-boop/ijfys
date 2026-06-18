import Link from "next/link";
import SearchBox from "@/components/search/SearchBox";
import VideoGrid from "@/components/video/VideoGrid";
import SearchHistory from "./SearchHistory";
import { HOT_KEYWORDS, searchPaged } from "@/lib/api";

export const metadata = { title: "搜索 - 飓风影视" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = ((sp.q as string) || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 24;
  const data = q ? await searchPaged(q, page, limit) : null;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  const hot = data?.hot ?? HOT_KEYWORDS;

  function pageHref(p: number) {
    const usp = new URLSearchParams();
    usp.set("q", q);
    usp.set("page", String(p));
    return `/search?${usp.toString()}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">搜索</h1>
      <SearchBox defaultValue={q} />

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">热门搜索：</span>
        {hot.map((k) => (
          <Link
            key={k}
            href={`/search?q=${encodeURIComponent(k)}`}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-text transition text-xs"
          >
            {k}
          </Link>
        ))}
      </div>

      <SearchHistory currentKeyword={q} />

      {q && data && (
        <div className="mt-8 space-y-10">
          {/* 演员（仅首页） */}
          {data.actors.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-primary rounded-full" />
                <h2 className="text-base font-semibold">相关演员</h2>
                <span className="text-xs text-muted">{data.actors.length} 位</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {data.actors.map((a) => (
                  <Link key={a.id} href={`/actor/${a.id}`} className="group flex flex-col items-center text-center">
                    {a.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.cover} alt={a.name} className="w-16 h-16 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-primary/40 transition" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-surface2 flex items-center justify-center text-lg text-muted">
                        {a.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="text-sm text-text mt-2 truncate w-full">{a.name}</div>
                    <div className="text-[10px] text-muted">{a.area ?? ""}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 资讯 */}
          {data.articles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-primary rounded-full" />
                <h2 className="text-base font-semibold">相关资讯</h2>
              </div>
              <ul className="space-y-2">
                {data.articles.map((a) => (
                  <li key={a.id}>
                    <Link href={`/article/${a.id}`} className="flex items-center gap-3 p-2 rounded hover:bg-white/[0.03]">
                      {a.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.cover} alt="" className="w-16 h-11 object-cover rounded shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-text line-clamp-1">{a.title}</div>
                        {a.typeName && <div className="text-[10px] text-muted">{a.typeName}</div>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 影片 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="text-base font-semibold">影片结果</h2>
              <span className="text-xs text-muted">
                “{q}” 共 {data.total.toLocaleString()} 部 · 第 {page} / {pageCount} 页
              </span>
            </div>
            {data.items.length === 0 ? (
              <div className="text-center text-muted py-12 text-sm">未找到匹配影片</div>
            ) : (
              <>
                <VideoGrid videos={data.items} />
                {pageCount > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 text-sm">
                    {page > 1 && <Link href={pageHref(page - 1)} className="px-3 py-1 rounded border border-white/10 hover:border-white/30">上一页</Link>}
                    <span className="text-muted">{page} / {pageCount}</span>
                    {page < pageCount && <Link href={pageHref(page + 1)} className="px-3 py-1 rounded border border-white/10 hover:border-white/30">下一页</Link>}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
