"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Episode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  videoId: string;
  episodes: Episode[];
  currentEpisodeId?: string;
  compact?: boolean;
}

const GROUP_SIZE = 50;

export default function EpisodeList({ videoId, episodes, currentEpisodeId, compact }: Props) {
  const groups = useMemo(() => {
    if (episodes.length <= GROUP_SIZE) return [{ from: 1, to: episodes.length, slice: episodes }];
    const out: Array<{ from: number; to: number; slice: Episode[] }> = [];
    for (let i = 0; i < episodes.length; i += GROUP_SIZE) {
      out.push({
        from: i + 1,
        to: Math.min(i + GROUP_SIZE, episodes.length),
        slice: episodes.slice(i, i + GROUP_SIZE),
      });
    }
    return out;
  }, [episodes]);

  const activeGroupIdx = useMemo(() => {
    if (!currentEpisodeId) return 0;
    const idx = episodes.findIndex((e) => e.episodeId === currentEpisodeId);
    if (idx < 0) return 0;
    return Math.floor(idx / GROUP_SIZE);
  }, [episodes, currentEpisodeId]);

  const [groupIdx, setGroupIdx] = useState(activeGroupIdx);
  const currentGroup = groups[groupIdx] ?? groups[0];

  return (
    <div>
      {groups.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
          {groups.map((g, i) => (
            <button
              key={i}
              onClick={() => setGroupIdx(i)}
              className={cn(
                "px-2.5 py-1 rounded border tabular-nums transition",
                i === groupIdx
                  ? "bg-accent/20 border-accent text-accent"
                  : "bg-surface2 border-white/10 text-muted hover:text-text",
              )}
            >
              {g.from}-{g.to}
            </button>
          ))}
        </div>
      )}
      <div className={cn("grid gap-2", compact
        ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
        : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10")}>
        {currentGroup.slice.map((ep) => {
          const active = ep.episodeId === currentEpisodeId;
          return (
            <Link
              key={ep.episodeId}
              href={`/play/${videoId}/${ep.episodeId}`}
              className={cn(
                "h-9 rounded-md flex items-center justify-center text-xs transition border",
                active
                  ? "bg-primary border-primary text-white font-semibold"
                  : "bg-surface2 border-white/5 text-muted hover:text-text hover:border-accent/40",
              )}
            >
              {episodes.length > 30 ? ep.index + 1 : ep.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
