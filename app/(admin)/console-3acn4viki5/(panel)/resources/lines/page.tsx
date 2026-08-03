import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import Badge from "@/components/admin/Badge";
import { fetchSources, type AdminSourceRow } from "@/lib/admin/api";
import { fmtAgo, fmtNum } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminLinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const providerCode = (sp.provider as string) || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 20;

  const res = await fetchSources({ provider: providerCode, page, limit });

  const cols: DataTableColumn<AdminSourceRow>[] = [
    {
      key: "video",
      header: "视频",
      cell: (s) => (
        <div className="flex items-center gap-2 min-w-0">
          {s.videoCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.videoCover} alt="" className="w-8 h-11 object-cover rounded border border-white/10" />
          ) : (
            <div className="w-8 h-11 rounded border border-white/10 bg-surface2" />
          )}
          <span className="text-text truncate max-w-[200px]">{s.videoTitle}</span>
        </div>
      ),
    },
    {
      key: "provider",
      header: "资源站",
      cell: (s) => <Badge tone="info">{s.provider}</Badge>,
    },
    {
      key: "playFrom",
      header: "线路代码",
      cell: (s) => <code className="text-[11px] text-muted font-mono">{s.playFromCode}</code>,
    },
    {
      key: "name",
      header: "线路名",
      cell: (s) => (
        <span className="text-xs">
          {s.sourceName} <span className="text-muted">· {s.lineName}</span>
        </span>
      ),
    },
    {
      key: "quality",
      header: "画质",
      cell: (s) => <Badge tone="muted">{s.quality}</Badge>,
    },
    {
      key: "ep",
      header: "集数",
      align: "right",
      cell: (s) => <span className="tabular-nums text-xs">{s.totalEpisodes}</span>,
    },
    {
      key: "score",
      header: "评分",
      align: "right",
      cell: (s) => <span className="tabular-nums text-xs">{s.score.toFixed(1)}</span>,
    },
    {
      key: "active",
      header: "状态",
      cell: (s) =>
        s.isActive ? (
          <Badge tone="success">可用</Badge>
        ) : (
          <Badge tone="error">失效</Badge>
        ),
    },
    {
      key: "fail",
      header: "失败次数",
      align: "right",
      cell: (s) =>
        s.failureCount > 0 ? (
          <span className="text-red-300 tabular-nums text-xs">{s.failureCount}</span>
        ) : (
          <span className="text-muted text-xs">0</span>
        ),
    },
    {
      key: "updated",
      header: "更新",
      align: "right",
      cell: (s) => <span className="text-muted text-xs tabular-nums">{fmtAgo(s.updatedAt) ?? "—"}</span>,
    },
  ];

  const filterHref = (code: string) => {
    const usp = new URLSearchParams();
    if (code) usp.set("provider", code);
    return `/console-3acn4viki5/resources/lines${usp.toString() ? `?${usp.toString()}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="线路管理"
        description={`共 ${fmtNum(res.total)} 条播放线路`}
        breadcrumb={["资源管理", "线路管理"]}
      />
      <div className="flex items-center gap-1 text-xs mb-3">
        <ProviderTab href={filterHref("")} active={!providerCode}>全部</ProviderTab>
        <ProviderTab href={filterHref("ffzy")} active={providerCode === "ffzy"}>非凡</ProviderTab>
        <ProviderTab href={filterHref("lzzy")} active={providerCode === "lzzy"}>量子</ProviderTab>
        <ProviderTab href={filterHref("bfzy")} active={providerCode === "bfzy"}>暴风</ProviderTab>
      </div>
      <DataTable columns={cols} rows={res.items} />
      <Pagination
        page={page}
        total={res.total}
        limit={limit}
        basePath="/console-3acn4viki5/resources/lines"
        hrefFor={(p) => {
          const usp = new URLSearchParams();
          if (providerCode) usp.set("provider", providerCode);
          usp.set("page", String(p));
          return `/console-3acn4viki5/resources/lines?${usp.toString()}`;
        }}
      />
    </div>
  );
}

function ProviderTab({
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
