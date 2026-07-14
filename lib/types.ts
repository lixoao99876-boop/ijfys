export type Category = "movie" | "tv" | "anime" | "variety" | "short";

export const CATEGORY_LABEL: Record<Category, string> = {
  movie: "电影",
  tv: "剧集",
  anime: "动漫",
  variety: "综艺",
  short: "短剧",
};

export interface Episode {
  episodeId: string;
  name: string;
  index: number;
}

export interface SourceEpisode {
  episodeId: string;
  m3u8Url: string;
}

export interface Source {
  sourceId: string;
  sourceName: string;
  lineName: string;
  quality: string;
  episodes: SourceEpisode[];
}

export interface Video {
  id: string;
  title: string;
  originalTitle?: string;
  category: Category;
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
  /** TMDB 补齐元数据（SEO 用，enrich ok/partial 时才有） */
  enrichment?: VideoEnrichment;
  episodes: Episode[];
  sources: Source[];
}

export interface VideoEnrichment {
  tmdbId?: number;
  imdbId?: string;
  detailedDescription?: string;
  directors?: string[];
  writers?: string[];
  genresDetailed?: string[];
  releaseDate?: string;
  tmdbRating?: number;
  tmdbVoteCount?: number;
  runtime?: number;
  keywords?: string[];
  posterTmdb?: string;
  backdropTmdb?: string;
}

export interface HistoryItem {
  videoId: string;
  title: string;
  cover: string;
  episodeId: string;
  episodeName: string;
  episodeIndex: number;
  sourceId: string;
  progress: number;
  duration: number;
  updatedAt: number;
}

export interface FilterOption {
  label: string;
  value: string;
}
