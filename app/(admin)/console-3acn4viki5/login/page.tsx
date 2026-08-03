"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

const ADMIN_BASE_PATH = "/console-3acn4viki5";
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export default function ConsoleLoginPage() {
  const [usernameOrEmail, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await login({ usernameOrEmail: usernameOrEmail.trim(), password });
      if (!ADMIN_ROLES.has(r.user.role)) {
        setError("该账号无后台权限");
        setLoading(false);
        return;
      }
      // 全页跳转：让服务端布局带着新 cookie 重新校验渲染
      window.location.href = ADMIN_BASE_PATH;
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-text px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-xl p-8 space-y-5"
      >
        <div className="text-center space-y-1">
          <div className="text-xl font-semibold">{SITE_NAME} · 运营后台</div>
          <div className="text-sm text-muted">请使用管理员账号登录</div>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm text-muted">账号</label>
          <input
            value={usernameOrEmail}
            onChange={(e) => setU(e.target.value)}
            autoComplete="username"
            className="w-full bg-white/[0.04] border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30"
            placeholder="用户名或邮箱"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-muted">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            autoComplete="current-password"
            className="w-full bg-white/[0.04] border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30"
            placeholder="密码"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-black font-medium rounded px-3 py-2 disabled:opacity-50"
        >
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
