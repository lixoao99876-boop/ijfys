import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import Badge from "@/components/admin/Badge";
import { fetchActors, type AdminActorRow } from "@/lib/admin/api";
import { fmtAgo, fmtNum } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminActorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string) || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 20;

  const res = await fetchActors({ q, page, limit });

  const cols: DataTableColumn<AdminActorRow>[] = [
    {
      key: "cover",
      header: "头像",
      width: "56px",
      cell: (a) =>
        a.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.cover}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-white/10 bg-surface2"
          />
        ) : (
          <div className="w-10 h-10 rounded-full border border-white/10 bg-surface2 flex items-center justify-center text-xs text-muted">
            {a.name.slice(0, 1)}
          </div>
        ),
    },
    {
      key: "name",
      header: "姓名",
      cell: (a) => (
        <div>
          <div className="text-text font-medium">{a.name}</div>
          {a.alias && <div className="text-[11px] text-muted">{a.alias}</div>}
        </div>
      ),
    },
    {
      key: "sex",
      header: "性别",
      cell: (a) => <span className="text-xs text-muted">{a.sex ?? "—"}</span>,
    },
    {
      key: "area",
      header: "地区",
      cell: (a) => <span className="text-xs text-muted">{a.area ?? "—"}</span>,
    },
    {
      key: "birthday",
      header: "生日",
      cell: (a) => <span className="text-xs text-muted">{a.birthday ?? "—"}</span>,
    },
    {
      key: "works",
      header: "代表作",
      cell: (a) => (
        <span className="text-xs text-muted line-clamp-1 max-w-[320px]">{a.works ?? "—"}</span>
      ),
    },
    {
      key: "provider",
      header: "来源",
      cell: (a) => (a.providerCode ? <Badge tone="info">{a.providerCode}</Badge> : <span className="text-muted">—</span>),
    },
    {
      key: "status",
      header: "状态",
      cell: () => <Badge tone="success">启用</Badge>,
    },
    {
      key: "updated",
      header: "更新",
      align: "right",
      cell: (a) => <span className="text-muted text-xs tabular-nums">{fmtAgo(a.sourceUpdatedAt) ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      cell: () => (
        <div className="flex items-center justify-end gap-1.5 text-xs">
          <button className="text-muted border border-white/10 rounded px-2 py-0.5 cursor-not-allowed opacity-60" disabled>编辑</button>
          <button className="text-muted border border-white/10 rounded px-2 py-0.5 cursor-not-allowed opacity-60" disabled>关联作品</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="演员管理"
        description={`共 ${fmtNum(res.total)} 位演员`}
        breadcrumb={["内容管理", "演员管理"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            + 新增演员
          </button>
        }
      />
      <div className="flex items-center justify-end mb-3">
        <SearchBar basePath="/console-3acn4viki5/content/actors" placeholder="搜索姓名 / 别名..." />
      </div>
      <DataTable columns={cols} rows={res.items} />
      <Pagination
        page={page}
        total={res.total}
        limit={limit}
        basePath="/console-3acn4viki5/content/actors"
        hrefFor={(p) => {
          const usp = new URLSearchParams();
          if (q) usp.set("q", q);
          usp.set("page", String(p));
          return `/console-3acn4viki5/content/actors?${usp.toString()}`;
        }}
      />
    </div>
  );
}
