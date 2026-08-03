import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import Badge from "@/components/admin/Badge";
import { fetchSyncLogs, type AdminSyncLogRow } from "@/lib/admin/api";
import { fmtAgo, fmtDate, fmtMs, fmtNum } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminSyncPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const entity = (sp.entity as string) || "";
  const status = (sp.status as string) || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 20;

  const res = await fetchSyncLogs({ entity, status, page, limit });

  const cols: DataTableColumn<AdminSyncLogRow>[] = [
    {
      key: "time",
      header: "开始时间",
      cell: (l) => <span className="tabular-nums text-xs text-muted">{fmtDate(l.startedAt)}</span>,
    },
    {
      key: "provider",
      header: "资源站",
      cell: (l) => (
        <div className="flex items-center gap-2">
          <Badge tone="info">{l.provider}</Badge>
          <span className="text-xs">{l.providerName}</span>
        </div>
      ),
    },
    { key: "entity", header: "对象", cell: (l) => <Badge tone="muted">{l.entity}</Badge> },
    { key: "type", header: "类型", cell: (l) => <span className="text-muted text-xs">{l.type}</span> },
    {
      key: "status",
      header: "状态",
      cell: (l) =>
        l.status === "SUCCESS" ? (
          <Badge tone="success">成功</Badge>
        ) : l.status === "FAILED" ? (
          <Badge tone="error">失败</Badge>
        ) : (
          <Badge tone="warn">运行中</Badge>
        ),
    },
    { key: "pages", header: "页数", align: "right", cell: (l) => <span className="tabular-nums text-xs">{fmtNum(l.pagesFetched)}</span> },
    { key: "items", header: "条目", align: "right", cell: (l) => <span className="tabular-nums text-xs">{fmtNum(l.itemsSeen)}</span> },
    {
      key: "added",
      header: "新增",
      align: "right",
      cell: (l) => (
        <span className="tabular-nums text-xs text-emerald-300">
          +{fmtNum(l.videosAdded + l.actorsAdded + l.articlesAdded)}
        </span>
      ),
    },
    { key: "duration", header: "耗时", align: "right", cell: (l) => <span className="tabular-nums text-xs">{fmtMs(l.durationMs)}</span> },
    {
      key: "error",
      header: "错误",
      cell: (l) =>
        l.errorMessage ? (
          <span className="text-red-300 text-[11px] truncate max-w-[260px] inline-block">{l.errorMessage}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  const tabHref = (e: string, s: string) => {
    const usp = new URLSearchParams();
    if (e) usp.set("entity", e);
    if (s) usp.set("status", s);
    return `/console-3acn4viki5/resources/sync${usp.toString() ? `?${usp.toString()}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="同步任务"
        description={`共 ${fmtNum(res.total)} 条同步记录`}
        breadcrumb={["资源管理", "同步任务"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            + 触发同步
          </button>
        }
      />
      <div className="flex items-center gap-1 text-xs mb-3 flex-wrap">
        <span className="text-muted mr-1">对象：</span>
        <FilterTab href={tabHref("", status)} active={!entity}>全部</FilterTab>
        <FilterTab href={tabHref("VIDEO", status)} active={entity === "VIDEO"}>视频</FilterTab>
        <FilterTab href={tabHref("ACTOR", status)} active={entity === "ACTOR"}>演员</FilterTab>
        <FilterTab href={tabHref("ARTICLE", status)} active={entity === "ARTICLE"}>资讯</FilterTab>
        <span className="text-muted mx-2">·</span>
        <span className="text-muted mr-1">状态：</span>
        <FilterTab href={tabHref(entity, "")} active={!status}>全部</FilterTab>
        <FilterTab href={tabHref(entity, "SUCCESS")} active={status === "SUCCESS"}>成功</FilterTab>
        <FilterTab href={tabHref(entity, "FAILED")} active={status === "FAILED"}>失败</FilterTab>
        <FilterTab href={tabHref(entity, "RUNNING")} active={status === "RUNNING"}>运行中</FilterTab>
      </div>
      <DataTable columns={cols} rows={res.items} caption={`最近 ${res.items.length} 条 · 自动每 10 分钟增量同步`} />
      <Pagination
        page={page}
        total={res.total}
        limit={limit}
        basePath="/console-3acn4viki5/resources/sync"
        hrefFor={(p) => {
          const usp = new URLSearchParams();
          if (entity) usp.set("entity", entity);
          if (status) usp.set("status", status);
          usp.set("page", String(p));
          return `/console-3acn4viki5/resources/sync?${usp.toString()}`;
        }}
      />
      <p className="text-[11px] text-muted/70 mt-3">
        提示：提示：当前自动通过 cron 每 10 分钟触发增量同步（VIDEO/ACTOR/ARTICLE 串行）；
        手动触发按钮已预留，业务接入阶段会绑定 NestJS 的 CrawlerService 实时同步入口。
        最近 {fmtAgo(res.items[0]?.startedAt ?? null) ?? "—"} 跑过。
      </p>
    </div>
  );
}

function FilterTab({
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
