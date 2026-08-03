import PageHeader from "@/components/admin/PageHeader";
import CommentsTable from "./CommentsTable";
import { fetchAdminComments } from "@/lib/admin/api";
import { fmtNum } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = (sp.status as string) || "PENDING";
  const q = (sp.q as string) || "";
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 30;
  const res = await fetchAdminComments({ status, q, page, limit });

  return (
    <div>
      <PageHeader
        title="评论审核"
        description={`共 ${fmtNum(res.total)} 条 · 当前筛选：${status} · 第 ${page} / ${Math.max(1, Math.ceil(res.total / limit))} 页`}
        breadcrumb={["系统管理", "评论审核"]}
      />
      <div className="flex items-center gap-1 text-xs mb-3">
        <Tab href="/console-3acn4viki5/system/comments?status=PENDING" active={status === "PENDING"}>待审核</Tab>
        <Tab href="/console-3acn4viki5/system/comments?status=APPROVED" active={status === "APPROVED"}>已通过</Tab>
        <Tab href="/console-3acn4viki5/system/comments?status=REJECTED" active={status === "REJECTED"}>已拒绝</Tab>
        <Tab href="/console-3acn4viki5/system/comments?status=" active={!status}>全部</Tab>
      </div>
      <CommentsTable items={res.items} page={page} total={res.total} limit={limit} currentStatus={status} />
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a href={href} className={`px-2.5 py-1 rounded border ${active ? "bg-white/[0.06] border-white/20 text-text" : "border-transparent text-muted hover:text-text"}`}>
      {children}
    </a>
  );
}
