"use client";

import { useMemo, useState } from "react";
import type { Category, Source } from "@/lib/types";
import EpisodeList from "./EpisodeList";
import { cn } from "@/lib/utils";

interface Props {
  videoId: string;
  category: Category;
  /** 视频规范化分集（每条 video.episodes 都有 episodeId/name/index） */
  episodes: Array<{ episodeId: string; name: string; index: number }>;
  /** 多条 source，每条线路只贡献「画质/线路名」标签，集列表共用 */
  sources: Source[];
}

/**
 * 线路与剧集分离：上方源 chips；下方单一集列表（共享 video.episodes）。
 * 当前选中的 sourceId 透传给 EpisodeList，集 link 会带上 ?source=… 让 PlayClient 用同一线路播放。
 */
export default function SourceEpisodePicker({ videoId, category, episodes, sources }: Props) {
  // 按 score 排序的 source 列表已由后端 toDTO 完成；这里只 pick 第 1 个作默认
  const [sourceIdx, setSourceIdx] = useState(0);
  const currentSource = sources[sourceIdx] ?? sources[0];

  // 取当前线路实际有 m3u8 的剧集子集（极少数 source 集数 != video.episodes）
  const epIds = useMemo(() => new Set(currentSource?.episodes.map((e) => e.episodeId) ?? []), [currentSource]);
  const visibleEpisodes = useMemo(
    () => episodes.filter((e) => epIds.size === 0 || epIds.has(e.episodeId)),
    [episodes, epIds],
  );

  if (!sources.length) {
    return <div className="text-sm text-muted py-6 text-center">该影片暂无可播放线路</div>;
  }

  return (
    <div>
      {/* 上方：源切换 */}
      <div className="flex items-center flex-wrap gap-2 mb-4">
        <span className="text-xs text-muted shrink-0">线路：</span>
        {sources.map((s, i) => {
          const active = i === sourceIdx;
          return (
            <button
              key={s.sourceId}
              onClick={() => setSourceIdx(i)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs border transition flex items-center gap-1.5",
                active
                  ? "bg-accent/20 border-accent text-accent"
                  : "bg-surface2 border-white/10 text-muted hover:text-text hover:border-white/30",
              )}
            >
              <span className="font-medium">{s.sourceName}</span>
              <span className="text-[10px] opacity-70">{s.quality}</span>
              <span className="text-[10px] opacity-50">· {s.episodes.length} 集</span>
            </button>
          );
        })}
      </div>

      {/* 下方：集列表（单一渲染，避免每源重复） */}
      <EpisodeList
        videoId={videoId}
        episodes={visibleEpisodes}
        category={category}
        sourceId={currentSource?.sourceId}
      />
    </div>
  );
}
