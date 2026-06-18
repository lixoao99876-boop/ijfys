"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listComments, postComment } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

interface CommentItem {
  id: string;
  content: string;
  likes: number;
  parentId: string | null;
  createdAt: string;
  user: { id: string; username: string; nickname: string | null; avatar: string | null };
}

export default function CommentSection({ videoId }: { videoId: string }) {
  const { user, refresh } = useAuthStore();
  const [items, setItems] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    listComments(videoId).then((r) => { setItems(r.items); setTotal(r.total); }).catch(() => {});
  }, [videoId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setMsg(null);
    try {
      await postComment(videoId, content);
      setContent("");
      setMsg("评论已提交，待审核通过后展示");
    } catch (e) {
      setMsg(`提交失败: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-4 bg-primary rounded-full" />
        <h3 className="text-base font-bold">评论 <span className="text-sm text-muted">({total})</span></h3>
      </div>

      {user ? (
        <form onSubmit={submit} className="bg-surface/40 border border-white/5 rounded-xl p-4 mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`以 ${user.nickname ?? user.username} 的身份发表评论...`}
            rows={3}
            maxLength={500}
            className="w-full bg-surface2 border border-white/10 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent/40"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted">{content.length} / 500 · 评论需审核通过后展示</span>
            <button
              type="submit"
              disabled={busy || !content.trim()}
              className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-white text-sm disabled:opacity-50"
            >
              {busy ? "提交中..." : "发表"}
            </button>
          </div>
          {msg && <div className="mt-2 text-xs text-emerald-300">{msg}</div>}
        </form>
      ) : (
        <div className="text-sm text-muted py-4 px-4 bg-surface/40 border border-white/5 rounded-xl mb-6">
          <Link href={`/login?next=/vod/${videoId}`} className="text-accent hover:underline">登录</Link>
          {" "}后即可发表评论
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center text-muted py-8 text-sm">还没有评论，快来抢沙发</div>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(c.user.nickname ?? c.user.username).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-text">{c.user.nickname ?? c.user.username}</span>
                  <span className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <p className="text-sm text-text/85 whitespace-pre-wrap">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
