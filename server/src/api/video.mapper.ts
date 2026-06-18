import type { Episode, Source, SourceEpisode, Video } from "@prisma/client";

/** 前端期望的 Video DTO（字段名与 ijfys/lib/types.ts 对齐） */
export interface VideoDTO {
  id: string;
  title: string;
  originalTitle?: string;
  category: string;
  cover: string;
  backdrop: string;
  year: number;
  region: string;
  genres: string[];
  actors: string[];
  director: string;
  description: string;
  remarks: string;
  score: number;
  updatedAt: string;
  episodes: Array<{ episodeId: string; name: string; index: number }>;
  sources: Array<{
    sourceId: string;
    sourceName: string;
    lineName: string;
    quality: string;
    episodes: Array<{ episodeId: string; m3u8Url: string }>;
  }>;
}

type FullVideo = Video & {
  episodes: Episode[];
  sources: Array<Source & { episodes: SourceEpisode[] }>;
};

const PLACEHOLDER_COVER = "https://picsum.photos/seed/placeholder/400/600";
const PLACEHOLDER_BACKDROP = "https://picsum.photos/seed/placeholder-bd/1600/900";

export function toDTO(v: FullVideo): VideoDTO {
  const epById = new Map(v.episodes.map((e) => [e.id, e]));
  // 按线路评分倒序输出
  const orderedSources = [...v.sources].sort((a, b) => b.score - a.score);

  return {
    id: v.id,
    title: v.title,
    originalTitle: v.originalTitle ?? undefined,
    category: v.category,
    cover: v.cover ?? PLACEHOLDER_COVER,
    backdrop: v.backdrop ?? PLACEHOLDER_BACKDROP,
    year: v.year ?? 0,
    region: v.region ?? "",
    genres: v.genres ?? [],
    actors: v.actors ?? [],
    director: v.director ?? "",
    description: v.description ?? "",
    remarks: v.remarks ?? "",
    score: v.score ?? 0,
    updatedAt: (v.sourceUpdatedAt ?? v.updatedAt).toISOString(),
    episodes: v.episodes
      .sort((a, b) => a.index - b.index)
      .map((e) => ({ episodeId: e.id, name: e.name, index: e.index })),
    sources: orderedSources.map((s) => ({
      sourceId: s.id,
      sourceName: s.sourceName,
      lineName: s.lineName,
      quality: s.quality,
      episodes: s.episodes
        .map((se) => {
          const ep = epById.get(se.episodeId);
          if (!ep) return null;
          return { episodeId: se.episodeId, m3u8Url: se.m3u8Url };
        })
        .filter((x): x is { episodeId: string; m3u8Url: string } => !!x),
    })),
  };
}

export const FULL_VIDEO_INCLUDE = {
  episodes: true,
  sources: { include: { episodes: true } },
} as const;
