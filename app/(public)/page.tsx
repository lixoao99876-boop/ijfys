import Link from "next/link";
import HeroBanner from "@/components/home/HeroBanner";
import SectionRow from "@/components/home/SectionRow";
import RecentlyWatched from "@/components/video/RecentlyWatched";
import { getConfiguredHome, listCollections } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function HomePage() {
  const [{ channels }, collections] = await Promise.all([getConfiguredHome(), listCollections().catch(() => [])]);
  const banner = channels.find((c) => c.kind === "BANNER");
  const rows = channels.filter((c) => c.kind !== "BANNER" && c.items.length > 0);

  return (
    <div>
      {banner && banner.items.length > 0 && <HeroBanner videos={banner.items} />}

      <RecentlyWatched limit={6} />

      {collections.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="text-base font-semibold">专题合集</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {collections.slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`/collection/${c.slug}`}
                className="group relative aspect-[16/9] rounded-xl overflow-hidden bg-surface2 border border-white/5 hover:border-accent/40 transition"
              >
                {c.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover} alt={c.title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="text-text font-semibold text-sm line-clamp-1">{c.title}</div>
                  <div className="text-[10px] text-muted">{c.itemCount} 部作品</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {rows.map((c) => (
        <SectionRow
          key={c.code}
          title={c.title}
          videos={c.items}
          moreHref={c.categoryFilter ? `/category/${c.categoryFilter}` : c.collectionSlug ? `/collection/${c.collectionSlug}` : undefined}
        />
      ))}

      {rows.length === 0 && (
        <div className="text-center text-muted py-20 text-sm">
          首页频道未启用，请在后台「系统设置 → 首页配置」开启至少一个频道。
        </div>
      )}
    </div>
  );
}
