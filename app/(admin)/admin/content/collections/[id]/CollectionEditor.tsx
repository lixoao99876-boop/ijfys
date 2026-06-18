"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCollectionItem,
  removeCollectionItem,
  reorderCollectionItems,
  updateCollection,
  type AdminCollectionDetail,
} from "@/lib/admin/api";
import { fmtCategory } from "@/lib/admin/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface VideoSearchResult {
  id: string;
  title: string;
  cover: string;
  category: string;
  year: number;
  region: string;
}

export default function CollectionEditor({ initial }: { initial: AdminCollectionDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initial.items);
  const [meta, setMeta] = useState({
    title: initial.title,
    slug: initial.slug,
    description: initial.description ?? "",
    cover: initial.cover ?? "",
  });
  const [picking, setPicking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function notice(s: string) {
    setMsg(s);
    setTimeout(() => setMsg((m) => (m === s ? null : m)), 3000);
  }

  async function saveMeta() {
    try {
      await updateCollection(initial.id, {
        title: meta.title,
        slug: meta.slug,
        description: meta.description || null,
        cover: meta.cover || null,
      });
      notice("已保存");
      startTransition(() => router.refresh());
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function add(videoId: string) {
    try {
      await addCollectionItem(initial.id, videoId);
      notice("已加入");
      setPicking(false);
      startTransition(() => router.refresh());
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function remove(videoId: string) {
    try {
      await removeCollectionItem(initial.id, videoId);
      setItems((xs) => xs.filter((it) => it.videoId !== videoId));
      notice("已移除");
      startTransition(() => router.refresh());
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
    try {
      await reorderCollectionItems(initial.id, next.map((it) => it.videoId));
      notice("顺序已保存");
      startTransition(() => router.refresh());
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <div>
      {msg && <div className="mb-3 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">{msg}</div>}

      {/* Meta editor */}
      <div className="rounded-lg border border-white/5 bg-[#0f141d] p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4 text-text">基础信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="标题">
            <input className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </Field>
          <Field label="slug">
            <input className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text" value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} />
          </Field>
          <Field label="封面 URL" wide>
            <input className="w-full h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text" value={meta.cover} onChange={(e) => setMeta({ ...meta, cover: e.target.value })} />
          </Field>
          <Field label="说明" wide>
            <textarea className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10 text-sm text-text" rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveMeta} disabled={pending} className="px-3 h-8 rounded bg-primary/20 border border-primary/40 text-primary text-sm">保存</button>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-lg border border-white/5 bg-[#0f141d] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text">视频列表（共 {items.length} 部）</h3>
          <button onClick={() => setPicking(true)} className="px-3 h-8 rounded bg-primary/15 border border-primary/30 text-primary text-sm">+ 添加视频</button>
        </div>
        {items.length === 0 ? (
          <div className="text-xs text-muted py-6 text-center">空专题，请添加视频</div>
        ) : (
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={it.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.025] group">
                <span className="text-muted text-xs tabular-nums w-6">{i + 1}</span>
                {it.video?.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.video.cover} alt="" className="w-8 h-11 object-cover rounded shrink-0" />
                ) : <div className="w-8 h-11 rounded bg-surface2 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text truncate">{it.video?.title ?? "(视频已删除)"}</div>
                  <div className="text-[10px] text-muted">
                    {it.video?.category ? fmtCategory(it.video.category) : "—"} · {it.video?.year ?? "—"}
                    {it.video?.status && it.video.status !== "PUBLISHED" && <span className="ml-1 text-red-300">[{it.video.status}]</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs opacity-50 group-hover:opacity-100 transition">
                  <button disabled={pending || i === 0} onClick={() => move(i, -1)} className="px-1.5 py-0.5 rounded border border-white/10 disabled:opacity-30">↑</button>
                  <button disabled={pending || i === items.length - 1} onClick={() => move(i, 1)} className="px-1.5 py-0.5 rounded border border-white/10 disabled:opacity-30">↓</button>
                  <button disabled={pending} onClick={() => remove(it.videoId)} className="px-1.5 py-0.5 rounded border border-red-500/30 text-red-300">移除</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {picking && <VideoPicker onPick={add} onClose={() => setPicking(false)} />}
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="text-xs text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

function VideoPicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<VideoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q.trim())}&limit=12`);
      if (r.ok) {
        const data = await r.json();
        setResults(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f141d] border border-white/10 rounded-lg w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text">添加视频</h3>
          <button onClick={onClose} className="text-muted">✕</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} autoFocus placeholder="搜索视频标题..." className="flex-1 h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text" />
          <button onClick={search} disabled={loading} className="h-8 px-3 rounded bg-primary/20 border border-primary/40 text-primary text-sm">{loading ? "搜索中" : "搜索"}</button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {results.length === 0 && !loading && <div className="text-xs text-muted py-8 text-center">输入关键词开始搜索</div>}
          <ul className="space-y-1">
            {results.map((v) => (
              <li key={v.id} onClick={() => onPick(v.id)} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.05] cursor-pointer">
                {v.cover && <img src={v.cover} alt="" className="w-8 h-11 object-cover rounded shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text truncate">{v.title}</div>
                  <div className="text-[10px] text-muted">{fmtCategory(v.category)} · {v.year} · {v.region}</div>
                </div>
                <button className="px-2 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary text-xs">加入</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
