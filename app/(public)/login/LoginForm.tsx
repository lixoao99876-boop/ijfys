"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login, mergeHistories } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import { useHistoryStore } from "@/stores/historyStore";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const setUser = useAuthStore((s) => s.setUser);
  const localHistory = useHistoryStore((s) => s.items);
  const [form, setForm] = useState({ usernameOrEmail: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    useAuthStore.getState().refresh();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await login(form);
      setUser(r.user);
      if (localHistory.length > 0) {
        try {
          await mergeHistories(
            localHistory.map((h) => ({
              videoId: h.videoId,
              episodeId: h.episodeId,
              episodeName: h.episodeName,
              progress: h.progress,
              duration: h.duration,
              updatedAt: h.updatedAt,
            })),
          );
        } catch { /* ignore */ }
      }
      router.replace(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 bg-surface/40 border border-white/5 rounded-xl p-6">
      <div>
        <label className="block text-xs text-muted mb-1">账号或邮箱</label>
        <input
          type="text"
          value={form.usernameOrEmail}
          onChange={(e) => setForm({ ...form, usernameOrEmail: e.target.value })}
          required
          autoFocus
          className="w-full h-10 px-3 rounded-md bg-surface2 border border-white/10 text-sm focus:outline-none focus:border-primary/40"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">密码</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          className="w-full h-10 px-3 rounded-md bg-surface2 border border-white/10 text-sm focus:outline-none focus:border-primary/40"
        />
      </div>
      {err && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded">{err}</div>}
      <button
        type="submit"
        disabled={busy}
        className="w-full h-10 rounded-md bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-50"
      >
        {busy ? "登录中..." : "登录"}
      </button>
      <div className="text-center text-xs text-muted pt-2">
        还没账号？ <Link href="/register" className="text-accent hover:underline">立即注册</Link>
      </div>
    </form>
  );
}
