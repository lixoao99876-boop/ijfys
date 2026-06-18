"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHistoryStore } from "@/stores/historyStore";

/**
 * 最近观看（基于 localStorage history）
 * 接入登录后改为读 /api/user/histories
 */
export default function RecentlyWatched({ limit = 8 }: { limit?: number }) {
  const items = useHistoryStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || items.length === 0) return null;

  const list = items.slice(0, limit);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full" />
          <h2 className="text-base font-semibold">最近观看</h2>
        </div>
        <Link href="/history" className="text-xs text-muted hover:text-text">
          查看全部 →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {list.map((it) => {
          const pct = it.duration > 0 ? Math.min(100, Math.round((it.progress / it.duration) * 100)) : 0;
          return (
            <Link
              key={it.videoId}
              href={`/play/${it.videoId}/${it.episodeId}`}
              className="group flex gap-3 rounded-lg p-2 hover:bg-white/[0.04]"
            >
              {it.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.cover} alt="" className="w-16 h-22 object-cover rounded shrink-0" />
              )}
              <div className="min-w-0 flex flex-col justify-between flex-1">
                <div>
                  <div className="text-sm text-text line-clamp-1 group-hover:text-primary">{it.title}</div>
                  <div className="text-[11px] text-muted mt-0.5">{it.episodeName}</div>
                </div>
                {pct > 0 && (
                  <div className="text-[10px] text-muted">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-0.5">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    已看 {pct}%
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
