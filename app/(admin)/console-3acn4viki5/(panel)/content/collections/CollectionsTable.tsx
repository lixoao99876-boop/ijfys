"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/admin/Badge";
import { createCollection, deleteCollection, updateCollection, type AdminCollectionRow } from "@/lib/admin/api";
import { fmtAgo } from "@/lib/admin/format";

export default function CollectionsTable({ initial }: { initial: AdminCollectionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", description: "", cover: "" });

  function notice(s: string) {
    setMsg(s);
    setTimeout(() => setMsg((m) => (m === s ? null : m)), 3000);
  }

  async function submitCreate() {
    if (!form.slug || !form.title) {
      notice("slug 与 title 必填");
      return;
    }
    try {
      await createCollection({
        slug: form.slug,
        title: form.title,
        description: form.description || undefined,
        cover: form.cover || undefined,
      });
      setCreating(false);
      setForm({ slug: "", title: "", description: "", cover: "" });
      notice("已创建");
      startTransition(() => router.refresh());
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function toggleEnabled(c: AdminCollectionRow) {
    try {
      await updateCollection(c.id, { enabled: !c.enabled });
      startTransition(() => router.refresh());
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function remove(c: AdminCollectionRow) {
    if (!confirm(`确定删除专题《${c.title}》？引用此专题的 home_channel 会自动断连。`)) return;
    try {
      await deleteCollection(c.id);
      notice("已删除");
      startTransition(() => router.refresh());
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <div>
      {msg && (
        <div className="mb-3 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">
          {msg}
        </div>
      )}

      <div className="flex justify-end mb-3">
        <button
          onClick={() => setCreating(true)}
          className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm hover:bg-primary/25"
        >
          + 新建专题
        </button>
      </div>

      <div className="rounded-lg border border-white/5 bg-[#0f141d] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] border-b border-white/5">
            <tr>
              <Th>封面</Th><Th>标题</Th><Th>slug</Th><Th>说明</Th><Th align="right">作品数</Th><Th>状态</Th><Th align="right">更新</Th><Th align="right">操作</Th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted py-12 text-sm">尚未创建专题</td></tr>
            )}
            {initial.map((c) => (
              <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition">
                <Td>
                  {c.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover} alt="" className="w-14 h-9 object-cover rounded" />
                  ) : (
                    <div className="w-14 h-9 rounded bg-surface2" />
                  )}
                </Td>
                <Td><span className="text-text font-medium">{c.title}</span></Td>
                <Td><code className="text-[11px] text-muted font-mono">{c.slug}</code></Td>
                <Td><span className="text-xs text-muted line-clamp-1 max-w-[260px] inline-block align-middle">{c.description ?? "—"}</span></Td>
                <Td align="right"><span className="tabular-nums">{c.itemCount}</span></Td>
                <Td>{c.enabled ? <Badge tone="success">启用</Badge> : <Badge tone="muted">禁用</Badge>}</Td>
                <Td align="right"><span className="text-xs text-muted tabular-nums">{fmtAgo(c.updatedAt)}</span></Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5 text-xs">
                    <Link href={`/console-3acn4viki5/content/collections/${c.id}`} className="text-muted border border-white/10 hover:border-white/30 rounded px-2 py-0.5">编辑</Link>
                    <a href={`/collection/${c.slug}`} target="_blank" className="text-muted border border-white/10 hover:border-white/30 rounded px-2 py-0.5">预览</a>
                    <button disabled={pending} onClick={() => toggleEnabled(c)} className={`rounded px-2 py-0.5 border ${c.enabled ? "text-yellow-300 border-yellow-500/30" : "text-emerald-300 border-emerald-500/30"}`}>
                      {c.enabled ? "禁用" : "启用"}
                    </button>
                    <button disabled={pending} onClick={() => remove(c)} className="text-red-300 border border-red-500/30 rounded px-2 py-0.5">删除</button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="bg-[#0f141d] border border-white/10 rounded-lg w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text mb-4">新建专题</h3>
            <div className="space-y-3">
              <Field label="标题">
                <input className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：经典武侠剧合集" />
              </Field>
              <Field label="slug" hint="URL 用，例 wuxia">
                <input className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="拼音/英文" />
              </Field>
              <Field label="说明">
                <textarea className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10 text-sm text-text" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label="封面 URL">
                <input className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text" value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} placeholder="https://..." />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCreating(false)} className="px-3 h-8 rounded border border-white/10 text-muted text-sm">取消</button>
              <button onClick={submitCreate} className="px-3 h-8 rounded bg-primary/20 border border-primary/40 text-primary text-sm">创建</button>
            </div>
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
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 items-start">
      <div>
        <div className="text-xs text-text mt-1.5">{label}</div>
        {hint && <div className="text-[10px] text-muted/70">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
