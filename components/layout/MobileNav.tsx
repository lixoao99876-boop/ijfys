"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/nav";
import { SITE_HOST } from "@/lib/site";
import { useAuthStore } from "@/stores/authStore";
import Icon from "@/components/ui/Icon";

/** 移动端导航：汉堡按钮 + 左侧滑出抽屉（H5，md 以下显示） */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { user, refresh } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  // 打开时锁定 body 滚动
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      {/* 汉堡按钮（仅移动端） */}
      <button
        type="button"
        aria-label="打开菜单"
        onClick={() => setOpen(true)}
        className="md:hidden shrink-0 w-9 h-9 -ml-1 flex flex-col items-center justify-center gap-[5px] rounded-lg hover:bg-white/5 transition"
      >
        <span className="block w-5 h-0.5 bg-text rounded-full" />
        <span className="block w-5 h-0.5 bg-text rounded-full" />
        <span className="block w-5 h-0.5 bg-text rounded-full" />
      </button>

      {/* 抽屉与遮罩通过 Portal 挂到 body，避免被 header 的 backdrop-filter 限制包含块 */}
      {mounted &&
        createPortal(
          <>
            {/* 遮罩 */}
            <div
              onClick={() => setOpen(false)}
              className={cn(
                "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity md:hidden",
                open ? "opacity-100" : "opacity-0 pointer-events-none",
              )}
            />

            {/* 抽屉 */}
            <aside
              className={cn(
                "fixed top-0 left-0 z-50 h-screen w-[280px] max-w-[82vw] bg-background border-r border-white/10 shadow-2xl md:hidden",
                "flex flex-col transition-transform duration-300 ease-out",
                open ? "translate-x-0" : "-translate-x-full",
              )}
              role="dialog"
              aria-modal="true"
            >
        {/* 顶部：账号 + 关闭 */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          {user ? (
            <Link
              href="/me"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shrink-0">
                {(user.nickname ?? user.username).slice(0, 1).toUpperCase()}
              </div>
              <span className="font-semibold truncate">{user.nickname ?? user.username}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 flex-1"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Icon name="user" size={20} />
              </div>
              <span className="font-semibold">登录 / 注册</span>
            </Link>
          )}
          <button
            type="button"
            aria-label="关闭菜单"
            onClick={() => setOpen(false)}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-white/5 transition"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map((item) => {
            const base = item.href.split("?")[0];
            const active =
              base === "/"
                ? pathname === "/" && item.href === "/"
                : pathname.startsWith(base);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition",
                  active
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                    : "text-muted hover:text-text hover:bg-white/5",
                )}
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部：辅助入口 */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            href="/history"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] text-muted hover:text-text hover:bg-white/5 transition"
          >
            <Icon name="clock" size={20} />
            <span>观看历史</span>
          </Link>
          <div className="px-4 pt-2 text-xs text-muted/60">© {new Date().getFullYear()} {SITE_HOST}</div>
        </div>
            </aside>
          </>,
          document.body,
        )}
    </>
  );
}
