import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import { fetchPopular, fetchPopularActors, fetchRankings, type AdminPopularRow, type PopularActor } from "@/lib/admin/api";
import { fmtAgo, fmtCategory, fmtNum } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminPopularPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = (sp.tab as string) || "videos";
  const metric = (sp.metric as string) || "score";

  const [videos, actors, rankings] = await Promise.all([
    fetchPopular({ metric, limit: 100 }),
    fetchPopularActors(100),
    fetchRankings(100),
  ]);

  const videoCols: DataTableColumn<AdminPopularRow>[] = [
    { key: "rank", header: "#", width: "48px", align: "center", cell: (r) => <span className={`tabular-nums text-sm ${r.rank <= 3 ? "text-primary font-medium" : r.rank <= 10 ? "text-text" : "text-muted"}`}>{r.rank}</span> },
    { key: "cover", header: "", width: "60px", cell: (r) => r.cover ? <img src={r.cover} alt="" className="w-10 h-14 object-cover rounded" /> : <div className="w-10 h-14 rounded bg-surface2" /> },
    { key: "title", header: "标题", cell: (r) => <a href={`/vod/${r.id}`} target="_blank" className="text-text font-medium hover:text-primary truncate max-w-[280px] block">{r.title}</a> },
    { key: "category", header: "分类", cell: (r) => <Badge tone="info">{fmtCategory(r.category)}</Badge> },
    { key: "region", header: "地区", cell: (r) => <span className="text-xs text-muted">{r.region ?? "—"}</span> },
    { key: "year", header: "年份", align: "right", cell: (r) => <span className="tabular-nums text-xs">{r.year ?? "—"}</span> },
    { key: "score", header: "评分", align: "right", cell: (r) => <span className="tabular-nums font-medium text-emerald-300">{r.score.toFixed(1)}</span> },
    { key: "sources", header: "线路", align: "right", cell: (r) => <span className="tabular-nums text-xs">{r.sources}</span> },
    { key: "remarks", header: "更新", cell: (r) => <span className="text-xs text-muted">{r.remarks ?? "—"}</span> },
    { key: "time", header: "时间", align: "right", cell: (r) => <span className="text-muted text-xs tabular-nums">{fmtAgo(r.sourceUpdatedAt) ?? "—"}</span> },
  ];

  const actorCols: DataTableColumn<PopularActor>[] = [
    { key: "rank", header: "#", width: "48px", align: "center", cell: (r) => <span className={`tabular-nums text-sm ${r.rank <= 3 ? "text-primary font-medium" : r.rank <= 10 ? "text-text" : "text-muted"}`}>{r.rank}</span> },
    { key: "cover", header: "", width: "48px", cell: (r) => r.actor?.cover ? <img src={r.actor.cover} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-[10px] text-muted">{r.name.slice(0,1)}</div> },
    { key: "name", header: "姓名", cell: (r) => r.actor ? <a href={`/actor/${r.actor.id}`} target="_blank" className="text-text font-medium hover:text-primary">{r.name}</a> : <span className="text-muted">{r.name}</span> },
    { key: "area", header: "地区", cell: (r) => <span className="text-xs text-muted">{r.actor?.area ?? "—"}</span> },
    { key: "birthday", header: "生日", cell: (r) => <span className="text-xs text-muted">{r.actor?.birthday ?? "—"}</span> },
    { key: "works", header: "作品数", align: "right", cell: (r) => <span className="tabular-nums font-medium text-text">{r.works}</span> },
  ];

  const searchCols = [
    { key: "rank", header: "#", width: "48px", align: "center" as const, cell: (r: typeof rankings.popularSearches[number]) => <span className={`tabular-nums text-sm ${r.rank <= 3 ? "text-primary font-medium" : r.rank <= 10 ? "text-text" : "text-muted"}`}>{r.rank}</span> },
    { key: "keyword", header: "关键词", cell: (r: typeof rankings.popularSearches[number]) => <a href={`/search?q=${encodeURIComponent(r.keyword)}`} target="_blank" className="text-text font-medium hover:text-primary">{r.keyword}</a> },
    { key: "hits", header: "搜索次数", align: "right" as const, cell: (r: typeof rankings.popularSearches[number]) => <span className="tabular-nums font-medium text-text">{fmtNum(r.hits)}</span> },
    { key: "last", header: "最近搜索", align: "right" as const, cell: (r: typeof rankings.popularSearches[number]) => <span className="text-muted text-xs tabular-nums">{fmtAgo(r.lastSearchedAt) ?? "—"}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="热门内容"
        description="影片 / 演员 / 搜索关键词 Top 100"
        breadcrumb={["统计管理", "热门内容"]}
      />
      <div className="flex items-center gap-1 text-xs mb-3 flex-wrap">
        <Tab href="/console-3acn4viki5/analytics/popular?tab=videos" active={tab === "videos"}>影片 Top 100</Tab>
        <Tab href="/console-3acn4viki5/analytics/popular?tab=actors" active={tab === "actors"}>演员 Top 100</Tab>
        <Tab href="/console-3acn4viki5/analytics/popular?tab=searches" active={tab === "searches"}>搜索 Top 100</Tab>
        {tab === "videos" && (
          <>
            <span className="text-muted mx-2">·</span>
            <Tab href="/console-3acn4viki5/analytics/popular?tab=videos&metric=score" active={metric === "score"}>按评分</Tab>
            <Tab href="/console-3acn4viki5/analytics/popular?tab=videos&metric=recent" active={metric === "recent"}>最近更新</Tab>
          </>
        )}
      </div>
      {tab === "videos" && <DataTable columns={videoCols} rows={videos} />}
      {tab === "actors" && <DataTable columns={actorCols} rows={actors} />}
      {tab === "searches" && <DataTable columns={searchCols} rows={rankings.popularSearches} />}
      <p className="text-[11px] text-muted/70 mt-3">
        提示：演员 Top 按 video.actors 数组中出现次数统计；接入用户行为后改为按播放/收藏维度。
      </p>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a href={href} className={`px-2.5 py-1 rounded border ${active ? "bg-white/[0.06] border-white/20 text-text" : "border-transparent text-muted hover:text-text"}`}>{children}</a>
  );
}
