"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Category, Episode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatEpisodeLabel } from "@/lib/episode-format";

interface Props {
  videoId: string;
  episodes: Episode[];
  currentEpisodeId?: string;
  compact?: boolean;
  category?: Category;
  /** 分页大小（默认 20，>20 才分组） */
  groupSize?: number;
  /** 跳转 /play 时附带的源 id；不传则跳转到默认源（sources[0]） */
  sourceId?: string;
}

const LONG_THRESHOLD = 100;

export default function EpisodeList({
  videoId,
  episodes,
  currentEpisodeId,
  compact,
  category,
  groupSize = 20,
  sourceId,
}: Props) {
  const total = episodes.length;
  const isLong = total > LONG_THRESHOLD;

  const groups = useMemo(() => {
    if (total <= groupSize) return [{ from: 1, to: total, slice: episodes }];
    const out: Array<{ from: number; to: number; slice: Episode[] }> = [];
    for (let i = 0; i < total; i += groupSize) {
      out.push({
        from: i + 1,
        to: Math.min(i + groupSize, total),
        slice: episodes.slice(i, i + groupSize),
      });
    }
    return out;
  }, [episodes, groupSize, total]);

  const currentIdx = useMemo(() => {
    if (!currentEpisodeId) return -1;
    return episodes.findIndex((e) => e.episodeId === currentEpisodeId);
  }, [episodes, currentEpisodeId]);

  const currentInLatest = currentIdx >= 0 && currentIdx >= total - groupSize;
  const activeGroupIdx = currentIdx >= 0 ? Math.floor(currentIdx / groupSize) : 0;

  // 长剧默认显示「最新」；但若用户正在看老集，跳到「全部」并定位
  const [mode, setMode] = useState<"latest" | "all">(
    isLong && currentIdx >= 0 && !currentInLatest ? "all" : isLong ? "latest" : "all",
  );
  const [groupIdx, setGroupIdx] = useState(activeGroupIdx);
  const currentGroup = groups[groupIdx] ?? groups[0];

  const latestSlice = useMemo(() => episodes.slice(-groupSize), [episodes, groupSize]);
  const visible = mode === "latest" ? latestSlice : currentGroup.slice;

  // 综艺日期紧凑模式
  const useCompact = compact ?? (category !== "variety" && total > 30);

  function toAll() {
    setGroupIdx(currentIdx >= 0 ? activeGroupIdx : groups.length - 1);
    setMode("all");
  }

  return (
    <div>
      {isLong && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <button
            onClick={() => setMode("latest")}
            className={cn(
              "px-3 py-1 rounded-md border transition",
              mode === "latest"
                ? "bg-primary/20 border-primary text-primary font-medium"
                : "bg-surface2 border-white/10 text-muted hover:text-text hover:border-white/30",
            )}
          >
            最新 {Math.min(groupSize, total)} 集
          </button>
          <button
            onClick={toAll}
            className={cn(
              "px-3 py-1 rounded-md border transition",
              mode === "all"
                ? "bg-primary/20 border-primary text-primary font-medium"
                : "bg-surface2 border-white/10 text-muted hover:text-text hover:border-white/30",
            )}
          >
            全部 {total} 集
          </button>
        </div>
      )}

      {mode === "all" && groups.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
          {groups.map((g, i) => (
            <button
              key={i}
              onClick={() => setGroupIdx(i)}
              className={cn(
                "px-3 py-1 rounded-md border tabular-nums transition",
                i === groupIdx
                  ? "bg-accent/20 border-accent text-accent font-medium"
                  : "bg-surface2 border-white/10 text-muted hover:text-text hover:border-white/30",
              )}
            >
              {g.from}-{g.to}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "grid gap-2",
          category === "variety"
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            : compact
              ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
              : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10",
        )}
      >
        {visible.map((ep) => {
          const active = ep.episodeId === currentEpisodeId;
          const label = formatEpisodeLabel(ep, category, useCompact);
          const href = sourceId
            ? `/play/${videoId}/${ep.episodeId}?source=${encodeURIComponent(sourceId)}`
            : `/play/${videoId}/${ep.episodeId}`;
          return (
            <Link
              key={ep.episodeId}
              href={href}
              title={ep.name}
              className={cn(
                "h-9 rounded-md flex items-center justify-center text-xs transition border px-2 truncate",
                active
                  ? "bg-primary border-primary text-white font-semibold"
                  : "bg-surface2 border-white/5 text-muted hover:text-text hover:border-accent/40",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
