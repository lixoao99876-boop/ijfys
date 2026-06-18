import Link from "next/link";
import { listCollections } from "@/lib/api";

export const metadata = { title: "专题合集 - 飓风影视" };

export default async function CollectionListPage() {
  const collections = await listCollections().catch(() => []);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">专题合集</h1>
      <p className="text-sm text-muted mb-6">共 {collections.length} 个专题</p>
      {collections.length === 0 ? (
        <div className="text-center text-muted py-20 text-sm">运营尚未创建专题。在后台「内容管理 → 专题合集」可创建。</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c) => (
            <Link
              key={c.slug}
              href={`/collection/${c.slug}`}
              className="group block aspect-[16/9] relative rounded-xl overflow-hidden bg-surface2 border border-white/5 hover:border-accent/40 transition"
            >
              {c.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.cover} alt={c.title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-text font-semibold text-base">{c.title}</h3>
                {c.description && <p className="text-xs text-muted line-clamp-1 mt-0.5">{c.description}</p>}
                <div className="text-[11px] text-muted mt-1">{c.itemCount} 部作品</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
