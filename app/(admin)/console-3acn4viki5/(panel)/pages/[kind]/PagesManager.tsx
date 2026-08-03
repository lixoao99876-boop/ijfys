"use client";

import { useState } from "react";
import {
  createSitePage,
  updateSitePage,
  deleteSitePage,
  type AdminSitePage,
  type SitePageKind,
} from "@/lib/admin/api";

interface Props {
  kind: SitePageKind;
  initial: AdminSitePage[];
}

type Draft = {
  id: string | null; // null = 新建
  slug: string;
  title: string;
  body: string;
  summary: string;
  published: boolean;
  order: number;
  isSystem: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  slug: "",
  title: "",
  body: "",
  summary: "",
  published: true,
  order: 0,
  isSystem: false,
});

function toDraft(p: AdminSitePage): Draft {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    body: p.body,
    summary: p.summary ?? "",
    published: p.published,
    order: p.order,
    isSystem: p.isSystem,
  };
}

export default function PagesManager({ kind, initial }: Props) {
  const [list, setList] = useState<AdminSitePage[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(initial[0] ? toDraft(initial[0]) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isAnnouncement = kind === "ANNOUNCEMENT";

  function select(p: AdminSitePage) {
    setError(null);
    setMsg(null);
    setDraft(toDraft(p));
  }
  function startCreate() {
    setError(null);
    setMsg(null);
    setDraft(emptyDraft());
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      if (draft.id === null) {
        const created = await createSitePage({
          slug: draft.slug,
          title: draft.title,
          kind,
          body: draft.body,
          summary: draft.summary || undefined,
          published: draft.published,
          order: draft.order,
        });
        setList((l) => [...l, created]);
        setDraft(toDraft(created));
        setMsg("已创建");
      } else {
        const updated = await updateSitePage(draft.id, {
          title: draft.title,
          body: draft.body,
          summary: draft.summary,
          published: draft.published,
          order: draft.order,
        });
        setList((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        setMsg("已保存");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft?.id || draft.isSystem) return;
    if (!confirm(`确认删除「${draft.title}」？`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteSitePage(draft.id);
      setList((l) => l.filter((x) => x.id !== draft.id));
      setDraft(null);
      setMsg("已删除");
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* 列表 */}
      <div className="lg:w-72 shrink-0">
        <button
          onClick={startCreate}
          className="w-full mb-3 px-3 py-2 rounded-lg bg-primary/90 hover:bg-primary text-white text-sm font-medium transition"
        >
          + 新建{isAnnouncement ? "公告" : "文章"}
        </button>
        <div className="space-y-1.5">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => select(p)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition ${
                draft?.id === p.id
                  ? "bg-white/10 border-white/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{p.title}</span>
                {p.isSystem && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 shrink-0">系统</span>}
                {!p.published && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted shrink-0">草稿</span>}
              </div>
              <div className="text-xs text-muted mt-0.5">/{p.slug}</div>
            </button>
          ))}
          {list.length === 0 && <p className="text-sm text-muted px-1">暂无内容，点上方新建。</p>}
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 min-w-0">
        {!draft ? (
          <div className="text-muted text-sm py-10 text-center border border-dashed border-white/10 rounded-xl">
            选择左侧条目编辑，或点「新建」。
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            <Field label="标题">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="admin-input"
                placeholder="页面标题"
              />
            </Field>

            <Field label="URL 标识 (slug)" hint={draft.id ? "已创建，不可修改" : "小写字母/数字/连字符，如 privacy"}>
              <input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                disabled={draft.id !== null}
                className="admin-input disabled:opacity-50"
                placeholder="slug"
              />
            </Field>

            {isAnnouncement && (
              <Field label="摘要" hint="公告列表显示">
                <input
                  value={draft.summary}
                  onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                  className="admin-input"
                  placeholder="一句话摘要（可选）"
                />
              </Field>
            )}

            <Field label="正文内容" hint="支持：# 标题、## 小标题、- 列表、**加粗**、空行分段">
              <textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={16}
                className="admin-input font-mono text-[13px] leading-relaxed resize-y"
                placeholder="在此编写内容…"
              />
            </Field>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                />
                已发布
              </label>
              <label className="flex items-center gap-2 text-sm">
                排序
                <input
                  type="number"
                  value={draft.order}
                  onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) || 0 })}
                  className="admin-input w-20 py-1"
                />
              </label>
            </div>

            {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>}
            {msg && <div className="text-sm text-green-400">{msg}</div>}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "保存中…" : draft.id === null ? "创建" : "保存"}
              </button>
              {draft.id && !draft.isSystem && (
                <button
                  onClick={remove}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 disabled:opacity-50"
                >
                  删除
                </button>
              )}
              {draft.isSystem && <span className="text-xs text-muted">系统页仅可编辑内容，不可删除。</span>}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .admin-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;font-size:14px;outline:none;color:inherit}
        .admin-input:focus{border-color:rgba(255,255,255,0.3)}
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-sm font-medium text-text">{label}</label>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
