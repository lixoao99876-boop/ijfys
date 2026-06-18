import PageHeader from "@/components/admin/PageHeader";
import SearchBar from "@/components/admin/SearchBar";
import VideosTable from "./VideosTable";
import { fetchVideos } from "@/lib/admin/api";
import { fmtNum } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string) || "";
  const category = (sp.category as string) || "";
  const region = (sp.region as string) || "";
  const year = (sp.year as string) || "";
  const status = (sp.status as string) || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 20;

  const res = await fetchVideos({ q, category, region, year, status, page, limit });

  const categoryQuery = (cat: string) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (cat) usp.set("category", cat);
    if (status) usp.set("status", status);
    return `/admin/content/videos${usp.toString() ? `?${usp.toString()}` : ""}`;
  };

  const statusQuery = (s: string) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (category) usp.set("category", category);
    if (s) usp.set("status", s);
    return `/admin/content/videos${usp.toString() ? `?${usp.toString()}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="视频管理"
        description={`共 ${fmtNum(res.total)} 条视频 · 当前第 ${page} / ${Math.max(1, Math.ceil(res.total / limit))} 页`}
        breadcrumb={["内容管理", "视频管理"]}
      />

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs flex-wrap">
          <CatTab href={categoryQuery("")} active={!category}>全部分类</CatTab>
          <CatTab href={categoryQuery("movie")} active={category === "movie"}>电影</CatTab>
          <CatTab href={categoryQuery("tv")} active={category === "tv"}>剧集</CatTab>
          <CatTab href={categoryQuery("anime")} active={category === "anime"}>动漫</CatTab>
          <CatTab href={categoryQuery("variety")} active={category === "variety"}>综艺</CatTab>
          <CatTab href={categoryQuery("short")} active={category === "short"}>短剧</CatTab>
          <span className="mx-2 text-muted/30">·</span>
          <CatTab href={statusQuery("")} active={!status}>上架+下架</CatTab>
          <CatTab href={statusQuery("PUBLISHED")} active={status === "PUBLISHED"}>已上架</CatTab>
          <CatTab href={statusQuery("UNPUBLISHED")} active={status === "UNPUBLISHED"}>已下架</CatTab>
          <CatTab href={statusQuery("DELETED")} active={status === "DELETED"}>回收站</CatTab>
        </div>
        <SearchBar basePath="/admin/content/videos" placeholder="搜索标题 / 原名..." />
      </div>

      <VideosTable
        items={res.items}
        page={page}
        total={res.total}
        limit={limit}
        currentQuery={{ q, category, region, year, status }}
      />
    </div>
  );
}

function CatTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`px-2.5 py-1 rounded border ${
        active ? "bg-white/[0.06] border-white/20 text-text" : "border-transparent text-muted hover:text-text"
      }`}
    >
      {children}
    </a>
  );
}
