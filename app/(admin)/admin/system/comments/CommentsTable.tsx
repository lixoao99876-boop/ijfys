"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/admin/Badge";
import { approveComment, bulkModerateComments, deleteCommentAdmin, rejectComment, type AdminCommentRow } from "@/lib/admin/api";
import { fmtAgo, fmtDate } from "@/lib/admin/format";

const STATUS_TONE: Record<AdminCommentRow["status"], "warn" | "success" | "error"> = {
  PENDING: "warn",
  APPROVED: "success",
  REJECTED: "error",
};

const STATUS_LABEL: Record<AdminCommentRow["status"], string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
};

export default function CommentsTable({
  items,
  page,
  total,
  limit,
  currentStatus,
}: {
  items: AdminCommentRow[];
  page: number;
  total: number;
  limit: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const allChecked = items.length > 0 && items.every((it) => selected.has(it.id));
  const pageCount = Math.max(1, Math.ceil(total / limit));

  function toggle(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  }

  function notice(s: string) { setMsg(s); setTimeout(() => setMsg((m) => m === s ? null : m), 3000); }

  async function approve(id: string) {
    try { await approveComment(id); notice("已通过"); startTransition(() => router.refresh()); } catch (e) { notice(`失败: ${e instanceof Error ? e.message : e}`); }
  }
  async function reject(id: string) {
    const reason = prompt("拒绝原因（可选）") ?? undefined;
    try { await rejectComment(id, reason); notice("已拒绝"); startTransition(() => router.refresh()); } catch (e) { notice(`失败: ${e instanceof Error ? e.message : e}`); }
  }
  async function del(id: string) {
    if (!confirm("软删除此评论？")) return;
    try { await deleteCommentAdmin(id); notice("已删除"); startTransition(() => router.refresh()); } catch (e) { notice(`失败: ${e instanceof Error ? e.message : e}`); }
  }
  async function bulkAction(action: "approve" | "reject") {
    if (selected.size === 0) return;
    let reason: string | undefined;
    if (action === "reject") reason = prompt("批量拒绝原因（可选）") ?? undefined;
    try {
      const r = await bulkModerateComments([...selected], action, reason);
      notice(`批量${action === "approve" ? "通过" : "拒绝"}：${r.updated} 条`);
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  function pageHref(p: number) {
    const usp = new URLSearchParams();
    if (currentStatus) usp.set("status", currentStatus);
    usp.set("page", String(p));
    return `/admin/system/comments?${usp.toString()}`;
  }

  return (
    <div>
      {msg && <div className="mb-3 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">{msg}</div>}

      {selected.size > 0 && (
        <div className="mb-2 px-3 py-2 rounded bg-accent/10 border border-accent/25 flex items-center gap-2 text-xs">
          <span className="text-text">已选 {selected.size} 条</span>
          <button disabled={pending} onClick={() => bulkAction("approve")} className="px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">批量通过</button>
          <button disabled={pending} onClick={() => bulkAction("reject")} className="px-2 py-0.5 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10">批量拒绝</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted hover:text-text">清空选中</button>
        </div>
      )}

      <div className="rounded-lg border border-white/5 bg-[#0f141d] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="w-9 py-2.5 px-3"><input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(items.map(it => it.id)))} className="accent-primary" /></th>
              <Th>用户</Th><Th>内容</Th><Th>对象</Th><Th>状态</Th><Th align="right">时间</Th><Th align="right">操作</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-12 text-sm">暂无评论</td></tr>}
            {items.map((c) => (
              <tr key={c.id} className={`border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition ${c.isDeleted ? "opacity-50" : ""}`}>
                <td className="py-2.5 px-3"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-primary" /></td>
                <Td>
                  <div className="text-sm text-text">{c.user.nickname ?? c.user.username}</div>
                  <div className="text-[10px] text-muted">@{c.user.username}</div>
                </Td>
                <Td>
                  <div className="text-sm text-text/85 max-w-[420px] line-clamp-2">{c.content}</div>
                  {c.rejectReason && <div className="text-[10px] text-red-300 mt-0.5">拒绝原因: {c.rejectReason}</div>}
                </Td>
                <Td>
                  <span className="text-xs text-muted">
                    {c.videoId ? <a href={`/vod/${c.videoId}`} target="_blank" className="text-accent hover:underline">vod:{c.videoId.slice(-6)}</a> : null}
                    {c.articleId ? <a href={`/article/${c.articleId}`} target="_blank" className="text-accent hover:underline">art:{c.articleId.slice(-6)}</a> : null}
                  </span>
                </Td>
                <Td><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></Td>
                <Td align="right"><span className="text-xs text-muted tabular-nums" title={fmtDate(c.createdAt)}>{fmtAgo(c.createdAt)}</span></Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5 text-xs">
                    {c.status !== "APPROVED" && <button disabled={pending} onClick={() => approve(c.id)} className="text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 rounded px-2 py-0.5">通过</button>}
                    {c.status !== "REJECTED" && <button disabled={pending} onClick={() => reject(c.id)} className="text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/10 rounded px-2 py-0.5">拒绝</button>}
                    <button disabled={pending} onClick={() => del(c.id)} className="text-red-300 border border-red-500/30 hover:bg-red-500/10 rounded px-2 py-0.5">删除</button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-muted">
          <div>共 <span className="text-text tabular-nums">{total.toLocaleString()}</span> 条 · 第 <span className="text-text tabular-nums">{page}</span> / <span className="tabular-nums">{pageCount}</span> 页</div>
          <div className="flex items-center gap-1">
            {page > 1 && <a href={pageHref(page - 1)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30">←</a>}
            <span className="px-2.5 py-1 rounded border tabular-nums bg-primary/15 border-primary/40 text-primary">{page}</span>
            {page < pageCount && <a href={pageHref(page + 1)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30">→</a>}
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return <th className={`text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return <td className={`py-2.5 px-3 align-middle ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
