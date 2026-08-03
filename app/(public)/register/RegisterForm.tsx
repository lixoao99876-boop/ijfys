"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import { SITE_NAME } from "@/lib/site";

export default function RegisterForm() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ username: "", password: "", email: "", nickname: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await register({
        username: form.username,
        password: form.password,
        email: form.email || undefined,
        nickname: form.nickname || undefined,
      });
      setUser(r.user);
      router.replace("/me");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "注册失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 text-center">注册{SITE_NAME}</h1>
      <form onSubmit={submit} className="space-y-4 bg-surface/40 border border-white/5 rounded-xl p-6">
        <Field label="用户名" hint="3-20 位字母/数字/下划线">
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            autoFocus
            className="w-full h-10 px-3 rounded-md bg-surface2 border border-white/10 text-sm focus:outline-none focus:border-primary/40"
          />
        </Field>
        <Field label="密码" hint="至少 6 位">
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
            className="w-full h-10 px-3 rounded-md bg-surface2 border border-white/10 text-sm focus:outline-none focus:border-primary/40"
          />
        </Field>
        <Field label="邮箱" hint="选填，用于找回密码">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full h-10 px-3 rounded-md bg-surface2 border border-white/10 text-sm focus:outline-none focus:border-primary/40"
          />
        </Field>
        <Field label="昵称" hint="选填，默认与用户名相同">
          <input
            type="text"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            className="w-full h-10 px-3 rounded-md bg-surface2 border border-white/10 text-sm focus:outline-none focus:border-primary/40"
          />
        </Field>
        {err && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded">{err}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-10 rounded-md bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-50"
        >
          {busy ? "注册中..." : "注册"}
        </button>
        <div className="text-center text-xs text-muted pt-2">
          已有账号？ <Link href="/login" className="text-accent hover:underline">立即登录</Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">
        {label} {hint && <span className="text-muted/60 ml-1 text-[10px]">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
