"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";
import Icon from "@/components/ui/Icon";

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-[#0a0d14] border-r border-white/5 h-screen sticky top-0 overflow-y-auto">
      <div className="px-5 py-5 border-b border-white/5">
        <Link href="/console-3acn4viki5" className="flex items-center gap-2 text-text">
          <span className="w-7 h-7 rounded-md bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
            飓
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{SITE_NAME}</div>
            <div className="text-[10px] text-muted">运营后台</div>
          </div>
        </Link>
      </div>

      <nav className="py-3">
        {ADMIN_NAV.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="px-5 pb-1.5 text-[10px] uppercase tracking-wider text-muted/70 flex items-center gap-1.5">
              <span className="text-muted/50 flex items-center"><Icon name={group.icon} size={16} /></span>
              {group.label}
            </div>
            <ul>
              {group.items.map((it) => {
                const active =
                  it.href === "/console-3acn4viki5"
                    ? pathname === "/console-3acn4viki5"
                    : pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        "block px-5 py-1.5 text-[13px] transition border-l-2",
                        active
                          ? "text-text bg-white/[0.04] border-primary"
                          : "text-muted border-transparent hover:text-text hover:bg-white/[0.02]",
                      )}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
