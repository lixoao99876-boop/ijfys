"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/admin/Badge";
import {
  addHomeChannelItem,
  patchHomeChannel,
  removeHomeChannelItem,
  reorderHomeChannelItems,
  reorderHomeChannels,
  type AdminHomeChannel,
  type HomeSortStrategy,
} from "@/lib/admin/api";

const SORT_STRATEGY_LABEL: Record<HomeSortStrategy, string> = {
  LATEST: "最近更新",
  SCORE: "高分优先",
  PLAY_COUNT: "热度优先",
  UPCOMING: "即将上映",
  MANUAL: "仅显示钉选",
};
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

export default function HomeConfigEditor({ initial }: { initial: AdminHomeChannel[] }) {
  const router = useRouter();
  const [channels, setChannels] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ channelCode: string } | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }
  function notice(s: string) {
    setMsg(s);
    setTimeout(() => setMsg((m) => (m === s ? null : m)), 3000);
  }

  async function moveChannel(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= channels.length) return;
    const next = [...channels];
    [next[idx], next[target]] = [next[target], next[idx]];
    setChannels(next);
    try {
      await reorderHomeChannels(next.map((c) => c.code));
      notice("顺序已保存");
      refresh();
    } catch (e) {
      notice(`保存失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function toggleEnabled(code: string, enabled: boolean) {
    try {
      await patchHomeChannel(code, { enabled });
      notice(enabled ? "已启用" : "已禁用");
      setChannels((cs) => cs.map((c) => (c.code === code ? { ...c, enabled } : c)));
      refresh();
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function toggleFill(code: string, fillFromDb: boolean) {
    try {
      await patchHomeChannel(code, { fillFromDb });
      setChannels((cs) => cs.map((c) => (c.code === code ? { ...c, fillFromDb } : c)));
      refresh();
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function saveLimit(code: string, itemLimit: number) {
    try {
      await patchHomeChannel(code, { itemLimit });
      setChannels((cs) => cs.map((c) => (c.code === code ? { ...c, itemLimit } : c)));
      notice("条数已保存");
      refresh();
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function saveSortStrategy(code: string, sortStrategy: HomeSortStrategy) {
    try {
      await patchHomeChannel(code, { sortStrategy });
      setChannels((cs) => cs.map((c) => (c.code === code ? { ...c, sortStrategy } : c)));
      notice(`排序策略 → ${SORT_STRATEGY_LABEL[sortStrategy]}`);
      refresh();
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function saveThreshold(code: string, field: "minScore" | "minPlayCount", value: number | null) {
    try {
      await patchHomeChannel(code, { [field]: value });
      setChannels((cs) => cs.map((c) => (c.code === code ? { ...c, [field]: value } : c)));
      notice(value === null ? "阈值已清除" : "阈值已保存");
      refresh();
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function removeItem(code: string, videoId: string) {
    try {
      await removeHomeChannelItem(code, videoId);
      notice("已移除");
      setChannels((cs) =>
        cs.map((c) => (c.code === code ? { ...c, items: c.items.filter((it) => it.videoId !== videoId) } : c)),
      );
      refresh();
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function moveItem(code: string, idx: number, dir: -1 | 1) {
    const ch = channels.find((c) => c.code === code);
    if (!ch) return;
    const target = idx + dir;
    if (target < 0 || target >= ch.items.length) return;
    const next = [...ch.items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setChannels((cs) => cs.map((c) => (c.code === code ? { ...c, items: next } : c)));
    try {
      await reorderHomeChannelItems(code, next.map((it) => it.videoId));
      notice("视频顺序已保存");
      refresh();
    } catch (e) {
      notice(`失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function pickAndAdd(channelCode: string, videoId: string) {
    try {
      await addHomeChannelItem(channelCode, videoId);
      notice("已加入");
      setPicker(null);
      refresh();
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

      <div className="space-y-3">
        {channels.map((c, idx) => (
          <div key={c.code} className="rounded-lg border border-white/5 bg-[#0f141d] p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted text-xs tabular-nums w-6">#{idx + 1}</span>
                <h3 className="text-sm font-semibold text-text">{c.title}</h3>
                <Badge tone={c.kind === "BANNER" ? "warn" : "info"}>{c.kind === "BANNER" ? "Banner" : "频道"}</Badge>
                {c.categoryFilter && <Badge tone="muted">限定: {fmtCategory(c.categoryFilter)}</Badge>}
                <code className="text-[10px] text-muted/70 font-mono">{c.code}</code>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  disabled={pending || idx === 0}
                  onClick={() => moveChannel(idx, -1)}
                  className="px-2 py-0.5 rounded border border-white/10 text-muted hover:text-text disabled:opacity-30"
                >
                  ↑ 上移
                </button>
                <button
                  disabled={pending || idx === channels.length - 1}
                  onClick={() => moveChannel(idx, 1)}
                  className="px-2 py-0.5 rounded border border-white/10 text-muted hover:text-text disabled:opacity-30"
                >
                  ↓ 下移
                </button>
                <ItemLimitControl
                  defaultValue={c.itemLimit}
                  onSave={(n) => saveLimit(c.code, n)}
                />
                <label className="flex items-center gap-1 text-xs text-muted">
                  <span>排序</span>
                  <select
                    value={c.sortStrategy}
                    onChange={(e) => saveSortStrategy(c.code, e.target.value as HomeSortStrategy)}
                    disabled={pending || c.kind === "COLLECTION"}
                    className="h-6 px-1.5 rounded bg-white/[0.04] border border-white/10 text-text text-xs disabled:opacity-40"
                  >
                    {(Object.keys(SORT_STRATEGY_LABEL) as HomeSortStrategy[]).map((k) => (
                      <option key={k} value={k}>
                        {SORT_STRATEGY_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <ThresholdControl
                  label="评分≥"
                  defaultValue={c.minScore ?? null}
                  step={0.5}
                  max={10}
                  onSave={(v) => saveThreshold(c.code, "minScore", v)}
                />
                <ThresholdControl
                  label="播放量≥"
                  defaultValue={c.minPlayCount ?? null}
                  step={100}
                  max={1000000}
                  onSave={(v) => saveThreshold(c.code, "minPlayCount", v)}
                />
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.fillFromDb}
                    onChange={(e) => toggleFill(c.code, e.target.checked)}
                    className="accent-primary"
                  />
                  <span className="text-muted">自动补齐</span>
                </label>
                <button
                  disabled={pending}
                  onClick={() => toggleEnabled(c.code, !c.enabled)}
                  className={`px-2 py-0.5 rounded border ${
                    c.enabled
                      ? "text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                      : "text-muted border-white/10 hover:text-text"
                  }`}
                >
                  {c.enabled ? "已启用" : "已禁用"}
                </button>
                <button
                  disabled={pending}
                  onClick={() => setPicker({ channelCode: c.code })}
                  className="px-2 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25"
                >
                  + 添加视频
                </button>
              </div>
            </div>

            {c.items.length === 0 ? (
              <div className="text-xs text-muted/70 py-3 border border-dashed border-white/10 rounded text-center">
                {c.fillFromDb ? `当前未钉选 · 自动从 DB 取最多 ${c.itemLimit} 条` : "未指定任何视频"}
              </div>
            ) : (
              <ul className="space-y-1">
                {c.items.map((it, i) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.025] group"
                  >
                    <span className="text-muted text-xs tabular-nums w-6">{i + 1}</span>
                    {it.video?.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.video.cover} alt="" className="w-8 h-11 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-8 h-11 rounded bg-surface2 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text truncate">{it.video?.title ?? "(视频已删除)"}</div>
                      <div className="text-[10px] text-muted">
                        {it.video?.category ? fmtCategory(it.video.category) : "—"} · {it.video?.year ?? "—"}
                        {it.video?.status && it.video.status !== "PUBLISHED" && (
                          <span className="ml-1 text-red-300">[{it.video.status}]</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs opacity-50 group-hover:opacity-100 transition">
                      <button
                        disabled={pending || i === 0}
                        onClick={() => moveItem(c.code, i, -1)}
                        className="px-1.5 py-0.5 rounded border border-white/10 text-muted hover:text-text disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        disabled={pending || i === c.items.length - 1}
                        onClick={() => moveItem(c.code, i, 1)}
                        className="px-1.5 py-0.5 rounded border border-white/10 text-muted hover:text-text disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => removeItem(c.code, it.videoId)}
                        className="px-1.5 py-0.5 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10"
                      >
                        移除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted/70 mt-3">
        💡 启用"自动补齐"后，钉选视频不足 N 条时由 DB Top N 自动填满（按分类的 sourceUpdatedAt / score 倒序）。
        前端首页通过 GET /api/home/configured 读取本页配置。
      </p>

      {picker && (
        <VideoPicker
          channelCode={picker.channelCode}
          onPick={(vid) => pickAndAdd(picker.channelCode, vid)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function ThresholdControl({
  label,
  defaultValue,
  step,
  max,
  onSave,
}: {
  label: string;
  defaultValue: number | null;
  step: number;
  max: number;
  onSave: (v: number | null) => void;
}) {
  const [v, setV] = useState(defaultValue === null ? "" : String(defaultValue));
  return (
    <label className="flex items-center gap-1 text-xs text-muted">
      <span>{label}</span>
      <input
        type="number"
        value={v}
        step={step}
        min={0}
        max={max}
        placeholder="—"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const trimmed = v.trim();
          if (trimmed === "") {
            if (defaultValue !== null) onSave(null);
            return;
          }
          const n = Number(trimmed);
          if (!Number.isFinite(n) || n < 0 || n > max) {
            setV(defaultValue === null ? "" : String(defaultValue));
            return;
          }
          if (n !== defaultValue) onSave(n);
        }}
        className="w-14 h-6 px-1 rounded bg-white/[0.04] border border-white/10 text-text tabular-nums"
      />
    </label>
  );
}

function ItemLimitControl({ defaultValue, onSave }: { defaultValue: number; onSave: (n: number) => void }) {
  const [v, setV] = useState(String(defaultValue));
  return (
    <label className="flex items-center gap-1 text-xs text-muted">
      <span>展示</span>
      <input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = Number(v);
          if (Number.isFinite(n) && n >= 1 && n <= 60 && n !== defaultValue) onSave(n);
          else setV(String(defaultValue));
        }}
        className="w-12 h-6 px-1 rounded bg-white/[0.04] border border-white/10 text-text tabular-nums"
      />
      <span>条</span>
    </label>
  );
}

function VideoPicker({
  channelCode,
  onPick,
  onClose,
}: {
  channelCode: string;
  onPick: (videoId: string) => void;
  onClose: () => void;
}) {
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
          <h3 className="text-sm font-semibold text-text">添加视频到「{channelCode}」</h3>
          <button onClick={onClose} className="text-muted hover:text-text">✕</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="搜索视频标题..."
            autoFocus
            className="flex-1 h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-sm text-text"
          />
          <button
            onClick={search}
            disabled={loading}
            className="h-8 px-3 rounded bg-primary/20 border border-primary/40 text-primary text-sm"
          >
            {loading ? "搜索中..." : "搜索"}
          </button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {results.length === 0 && !loading && (
            <div className="text-xs text-muted/70 py-8 text-center">输入关键词开始搜索</div>
          )}
          <ul className="space-y-1">
            {results.map((v) => (
              <li
                key={v.id}
                onClick={() => onPick(v.id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.05] cursor-pointer"
              >
                {v.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.cover} alt="" className="w-8 h-11 object-cover rounded shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text truncate">{v.title}</div>
                  <div className="text-[10px] text-muted">
                    {fmtCategory(v.category)} · {v.year} · {v.region}
                  </div>
                </div>
                <button className="px-2 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary text-xs">
                  加入
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
