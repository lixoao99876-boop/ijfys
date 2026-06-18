"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { formatRelative, formatTime } from "@/lib/utils";

export default function HistoryPage() {
  const items = useHistoryStore((s) => s.items);
  const clear = useHistoryStore((s) => s.clear);
  const remove = useHistoryStore((s) => s.remove);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">观看历史</h1>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary text-muted transition"
          >
            清空全部
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <div className="text-5xl mb-3">🕐</div>
          <div className="text-sm">还没有观看记录</div>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-full bg-primary hover:bg-primary/80 text-white text-xs transition"
          >
            去发现内容
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((it) => {
            const pct = it.duration > 0 ? Math.min(100, (it.progress / it.duration) * 100) : 0;
            return (
              <li
                key={`${it.videoId}-${it.updatedAt}`}
                className="flex gap-4 bg-surface/40 rounded-xl p-3 border border-white/5 hover:border-accent/30 transition"
              >
                <Link
                  href={`/play/${it.videoId}/${it.episodeId}`}
                  className="relative w-24 aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-surface2"
                >
                  <Image src={it.cover} alt={it.title} fill sizes="96px" className="object-cover" />
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <Link
                    href={`/vod/${it.videoId}`}
                    className="text-sm font-medium truncate hover:text-accent"
                  >
                    {it.title}
                  </Link>
                  <div className="text-xs text-muted mt-1">
                    {it.episodeName} · {formatRelative(it.updatedAt)}
                  </div>
                  <div className="mt-auto">
                    <div className="text-[11px] text-muted mb-1">
                      {formatTime(it.progress)} / {formatTime(it.duration)}
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  <Link
                    href={`/play/${it.videoId}/${it.episodeId}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary hover:bg-primary/80 transition"
                  >
                    继续
                  </Link>
                  <button
                    onClick={() => remove(it.videoId)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-muted transition"
                  >
                    删除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
