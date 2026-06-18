"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SITE_HOST } from "@/lib/site";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "首页", icon: "🏠" },
  { href: "/category/movie", label: "电影", icon: "🎬" },
  { href: "/category/tv", label: "剧集", icon: "📺" },
  { href: "/category/variety", label: "综艺", icon: "🎤" },
  { href: "/category/anime", label: "动漫", icon: "🐉" },
  { href: "/category/short", label: "短剧", icon: "📱" },
  { href: "/?tab=update", label: "更新", icon: "🆕" },
  { href: "/?tab=rank", label: "排行榜", icon: "🏆" },
  { href: "/?tab=app", label: "APP", icon: "📦" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col bg-surface/60 backdrop-blur-md border-r border-white/5 sticky top-0 h-screen">
      <Link href="/" className="px-6 py-5 flex items-center gap-2">
        <span className="text-2xl">🌀</span>
        <span className="text-xl font-bold tracking-tight">
          飓风<span className="text-primary">影视</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((item) => {
          const base = item.href.split("?")[0];
          const active = base === "/" ? pathname === "/" && item.href === "/" : pathname.startsWith(base);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-6 py-3 text-sm transition-colors",
                active
                  ? "bg-gradient-to-r from-primary/20 to-transparent text-text border-l-2 border-primary"
                  : "text-muted hover:text-text hover:bg-white/5 border-l-2 border-transparent",
              )}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 text-xs text-muted/70 border-t border-white/5">
        © {new Date().getFullYear()} {SITE_HOST}
      </div>
    </aside>
  );
}
