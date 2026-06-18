"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/admin/Badge";
import {
  bulkVideoStatus,
  editVideo,
  setVideoStatus,
  type AdminVideoRow,
} from "@/lib/admin/api";
import { fmtAgo, fmtCategory, fmtNum } from "@/lib/admin/format";

interface Props {
  items: AdminVideoRow[];
  page: number;
  total: number;
  limit: number;
  currentQuery: { q: string; category: string; region: string; year: string; status: string };
}

type EditingState = {
  id: string;
  title: string;
  originalTitle: string;
  year: string;
  region: string;
  remarks: string;
};

export default function VideosTable({ items, page, total, limit, currentQuery }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const allChecked = items.length > 0 && items.every((it) => selected.has(it.id));
  const pageCount = Math.max(1, Math.ceil(total / limit));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(items.map((it) => it.id)));
  }

  async function singleAction(id: string, status: "PUBLISHED" | "UNPUBLISHED" | "DELETED") {
    try {
      await setVideoStatus(id, status);
      setMsg(status === "PUBLISHED" ? "已上架" : status === "UNPUBLISHED" ? "已下架" : "已删除");
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg(`操作失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function bulkAction(status: "PUBLISHED" | "UNPUBLISHED" | "DELETED") {
    if (selected.size === 0) return;
    if (status === "DELETED" && !confirm(`确定删除选中的 ${selected.size} 条视频？（保留数据库记录，可在回收站恢复）`)) return;
    try {
      const r = await bulkVideoStatus([...selected], status);
      setMsg(`批量操作完成：${r.updated} 条`);
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg(`批量失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await editVideo(editing.id, {
        title: editing.title,
        originalTitle: editing.originalTitle || null,
        year: editing.year ? Number(editing.year) : null,
        region: editing.region || null,
        remarks: editing.remarks || null,
      });
      setMsg("已保存");
      setEditing(null);
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg(`保存失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  const pageHref = useMemo(
    () => (p: number) => {
      const usp = new URLSearchParams();
      Object.entries(currentQuery).forEach(([k, v]) => {
        if (v) usp.set(k, v);
      });
      usp.set("page", String(p));
      return `/admin/content/videos?${usp.toString()}`;
    },
    [currentQuery],
  );

  return (
    <div>
      {msg && (
        <div className="mb-2 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-muted">×</button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-2 px-3 py-2 rounded bg-accent/10 border border-accent/25 flex items-center gap-2 text-xs">
          <span className="text-text">已选 {selected.size} 条</span>
          <span className="text-muted">·</span>
          <button
            disabled={pending}
            onClick={() => bulkAction("PUBLISHED")}
            className="px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            批量上架
          </button>
          <button
            disabled={pending}
            onClick={() => bulkAction("UNPUBLISHED")}
            className="px-2 py-0.5 rounded border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
          >
            批量下架
          </button>
          <button
            disabled={pending}
            onClick={() => bulkAction("DELETED")}
            className="px-2 py-0.5 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10"
          >
            批量删除
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted hover:text-text">
            清空选中
          </button>
        </div>
      )}

      <div className="rounded-lg border border-white/5 bg-[#0f141d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                <th className="w-9 py-2.5 px-3 text-left">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="accent-primary"
                  />
                </th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-left">封面</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-left">标题</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-left">分类</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-left">地区</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-right">年份</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-left">更新状态</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-right">线路</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-left">状态</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-right">更新时间</th>
                <th className="text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition">
                  <td className="py-2.5 px-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(v.id)}
                      onChange={() => toggle(v.id)}
                      className="accent-primary"
                    />
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    {v.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.cover} alt="" className="w-10 h-14 object-cover rounded border border-white/10" />
                    ) : (
                      <div className="w-10 h-14 rounded border border-white/10 bg-surface2" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <div className="text-text font-medium truncate max-w-[260px]">{v.title}</div>
                    {v.originalTitle && (
                      <div className="text-[11px] text-muted truncate max-w-[260px]">{v.originalTitle}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 align-middle"><Badge tone="info">{fmtCategory(v.category)}</Badge></td>
                  <td className="py-2.5 px-3 align-middle text-xs text-muted">{v.region ?? "—"}</td>
                  <td className="py-2.5 px-3 align-middle text-right tabular-nums text-xs">{v.year ?? "—"}</td>
                  <td className="py-2.5 px-3 align-middle text-xs text-muted">{v.remarks ?? "—"}</td>
                  <td className="py-2.5 px-3 align-middle text-right tabular-nums text-xs">
                    <span className="text-text">{v.sources}</span>
                    <span className="text-muted"> / {fmtNum(v.episodes)} 集</span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    {v.status === "PUBLISHED" ? (
                      <Badge tone="success">上架</Badge>
                    ) : v.status === "UNPUBLISHED" ? (
                      <Badge tone="warn">下架</Badge>
                    ) : (
                      <Badge tone="error">已删除</Badge>
                    )}
                  </td>
                  <td className="py-2.5 px-3 align-middle text-right text-muted text-xs tabular-nums">
                    {fmtAgo(v.sourceUpdatedAt) ?? "—"}
                  </td>
                  <td className="py-2.5 px-3 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5 text-xs">
                      <a
                        href={`/vod/${v.id}`}
                        target="_blank"
                        className="text-muted hover:text-text border border-white/10 hover:border-white/30 rounded px-2 py-0.5"
                      >
                        预览
                      </a>
                      <button
                        onClick={() =>
                          setEditing({
                            id: v.id,
                            title: v.title,
                            originalTitle: v.originalTitle ?? "",
                            year: v.year ? String(v.year) : "",
                            region: v.region ?? "",
                            remarks: v.remarks ?? "",
                          })
                        }
                        className="text-muted border border-white/10 hover:border-white/30 hover:text-text rounded px-2 py-0.5"
                      >
                        编辑
                      </button>
                      {v.status === "PUBLISHED" ? (
                        <button
                          disabled={pending}
                          onClick={() => singleAction(v.id, "UNPUBLISHED")}
                          className="text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/10 rounded px-2 py-0.5"
                        >
                          下架
                        </button>
                      ) : v.status === "UNPUBLISHED" ? (
                        <button
                          disabled={pending}
                          onClick={() => singleAction(v.id, "PUBLISHED")}
                          className="text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 rounded px-2 py-0.5"
                        >
                          上架
                        </button>
                      ) : (
                        <button
                          disabled={pending}
                          onClick={() => singleAction(v.id, "PUBLISHED")}
                          className="text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 rounded px-2 py-0.5"
                        >
                          恢复
                        </button>
                      )}
                      {v.status !== "DELETED" && (
                        <button
                          disabled={pending}
                          onClick={() => {
                            if (confirm(`确定删除《${v.title}》？`)) singleAction(v.id, "DELETED");
                          }}
                          className="text-red-300 border border-red-500/30 hover:bg-red-500/10 rounded px-2 py-0.5"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-muted">
          <div>
            共 <span className="text-text tabular-nums">{total.toLocaleString()}</span> 条 · 第{" "}
            <span className="text-text tabular-nums">{page}</span> / <span className="tabular-nums">{pageCount}</span> 页
          </div>
          <div className="flex items-center gap-1">
            {page > 1 && <a href={pageHref(page - 1)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30">←</a>}
            <span className="px-2.5 py-1 rounded border tabular-nums bg-primary/15 border-primary/40 text-primary">{page}</span>
            {page < pageCount && <a href={pageHref(page + 1)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30">→</a>}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-[#0f141d] border border-white/10 rounded-lg w-full max-w-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-text mb-4">编辑视频</h3>
            <div className="space-y-3">
              <Field label="标题">
                <input
                  className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </Field>
              <Field label="原名">
                <input
                  className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text"
                  value={editing.originalTitle}
                  onChange={(e) => setEditing({ ...editing, originalTitle: e.target.value })}
                />
              </Field>
              <Field label="年份">
                <input
                  type="number"
                  className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text"
                  value={editing.year}
                  onChange={(e) => setEditing({ ...editing, year: e.target.value })}
                />
              </Field>
              <Field label="地区">
                <input
                  className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text"
                  value={editing.region}
                  onChange={(e) => setEditing({ ...editing, region: e.target.value })}
                />
              </Field>
              <Field label="备注">
                <input
                  className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text"
                  value={editing.remarks}
                  onChange={(e) => setEditing({ ...editing, remarks: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditing(null)}
                className="px-3 h-8 rounded border border-white/10 text-muted hover:text-text text-sm"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                className="px-3 h-8 rounded bg-primary/20 border border-primary/40 text-primary text-sm"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
      <div className="text-xs text-muted">{label}</div>
      <div>{children}</div>
    </div>
  );
}
