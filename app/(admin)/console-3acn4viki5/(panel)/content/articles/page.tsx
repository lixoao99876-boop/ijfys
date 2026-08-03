import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import Badge from "@/components/admin/Badge";
import { fetchArticles, type AdminArticleRow } from "@/lib/admin/api";
import { fmtAgo, fmtNum } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string) || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 20;

  const res = await fetchArticles({ q, page, limit });

  const cols: DataTableColumn<AdminArticleRow>[] = [
    {
      key: "cover",
      header: "封面",
      width: "72px",
      cell: (a) =>
        a.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.cover}
            alt=""
            className="w-14 h-10 object-cover rounded border border-white/10 bg-surface2"
          />
        ) : (
          <div className="w-14 h-10 rounded border border-white/10 bg-surface2" />
        ),
    },
    {
      key: "title",
      header: "标题",
      cell: (a) => <div className="text-text font-medium truncate max-w-[420px]">{a.title}</div>,
    },
    {
      key: "type",
      header: "分类",
      cell: (a) => (a.typeName ? <Badge tone="info">{a.typeName}</Badge> : <span className="text-muted">—</span>),
    },
    {
      key: "author",
      header: "作者",
      cell: (a) => <span className="text-xs text-muted">{a.author ?? "—"}</span>,
    },
    {
      key: "score",
      header: "评分",
      align: "right",
      cell: (a) => <span className="tabular-nums text-xs">{a.score.toFixed(1)}</span>,
    },
    {
      key: "hits",
      header: "点击",
      align: "right",
      cell: (a) => <span className="tabular-nums text-xs text-muted">{fmtNum(a.hits)}</span>,
    },
    {
      key: "status",
      header: "状态",
      cell: () => <Badge tone="success">已发布</Badge>,
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
          <button className="text-muted border border-white/10 rounded px-2 py-0.5 cursor-not-allowed opacity-60" disabled>下架</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="文章管理"
        description={`共 ${fmtNum(res.total)} 篇文章`}
        breadcrumb={["内容管理", "文章管理"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            + 新建文章
          </button>
        }
      />
      <div className="flex items-center justify-end mb-3">
        <SearchBar basePath="/console-3acn4viki5/content/articles" placeholder="搜索标题 / 作者..." />
      </div>
      <DataTable columns={cols} rows={res.items} />
      <Pagination
        page={page}
        total={res.total}
        limit={limit}
        basePath="/console-3acn4viki5/content/articles"
        hrefFor={(p) => {
          const usp = new URLSearchParams();
          if (q) usp.set("q", q);
          usp.set("page", String(p));
          return `/console-3acn4viki5/content/articles?${usp.toString()}`;
        }}
      />
    </div>
  );
}
