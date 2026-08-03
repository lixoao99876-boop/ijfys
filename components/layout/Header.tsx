"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HOT_KEYWORDS } from "@/lib/api/constants";
import { useAuthStore } from "@/stores/authStore";
import { SITE_NAME } from "@/lib/site";
import MobileNav from "./MobileNav";
import Icon from "@/components/ui/Icon";

export default function Header() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const { user, refresh } = useAuthStore();
  useEffect(() => { refresh(); }, [refresh]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const t = q.trim();
    if (!t) return;
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/5">
      <div className="flex items-center gap-3 md:gap-4 px-4 md:px-8 h-16">
        <MobileNav />
        <Link href="/" className="md:hidden flex items-center gap-1 font-bold shrink-0">
          <img src="/logo2.png" alt={SITE_NAME} width={26} height={26} className="rounded" />
          <span>{SITE_NAME}</span>
        </Link>

        <form onSubmit={submit} className="relative flex-1 max-w-2xl">
          <div className="flex items-center bg-surface2/80 rounded-full border border-white/5 hover:border-white/10 focus-within:border-accent/60 transition">
            <span className="pl-4 text-muted flex items-center"><Icon name="search" size={17} /></span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder="搜索影视、演员、导演…"
              className="flex-1 bg-transparent px-3 py-2.5 outline-none text-sm placeholder:text-muted/60"
            />
            <button
              type="submit"
              className="mr-1 px-4 py-1.5 text-sm rounded-full bg-primary hover:bg-primary/80 transition font-medium"
            >
              搜索
            </button>
          </div>
          {focused && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-surface2 rounded-2xl border border-white/5 p-4 shadow-xl">
              <div className="text-xs text-muted mb-2">热门搜索</div>
              <div className="flex flex-wrap gap-2">
                {HOT_KEYWORDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setQ(k);
                      router.push(`/search?q=${encodeURIComponent(k)}`);
                    }}
                    className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-text transition"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <Link
          href="/history"
          className="hidden sm:flex items-center gap-1.5 text-sm text-muted hover:text-text transition"
        >
          <Icon name="clock" size={16} />
          <span>历史</span>
        </Link>
        {user ? (
          <Link href="/me" className="flex items-center gap-2 text-sm hover:text-primary transition">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
              {(user.nickname ?? user.username).slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden md:inline">{user.nickname ?? user.username}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            登录
          </Link>
        )}
      </div>
    </header>
  );
}
