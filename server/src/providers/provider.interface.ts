import type { Category } from "@prisma/client";
import type { NormalizedActor, NormalizedArticle } from "../apple-cms/apple-cms.parser";

/** 适配器归一化后的视频（一条 = 一个 provider 视角的 vod） */
export interface NormalizedVod {
  providerCode: string;
  providerVodId: string;

  title: string;
  originalTitle?: string;
  category: Category;
  year: number | null;
  region: string | null;
  cover: string | null;
  backdrop: string | null;
  description: string | null;
  director: string | null;
  actors: string[];
  genres: string[];
  remarks: string | null;
  score: number;
  sourceUpdatedAt: Date | null;

  /** 多条 play source，每条对应 sources 表一行 */
  sources: NormalizedSource[];
}

export interface NormalizedSource {
  playFromCode: string;        // ffm3u8 / lz_m3u8
  sourceName: string;          // 展示名
  lineName: string;            // 线路类型
  quality: string;
  totalEpisodes: number;
  episodes: NormalizedSourceEpisode[];
}

export interface NormalizedSourceEpisode {
  index: number;
  name: string;
  m3u8Url: string;
}

export interface FetchOptions {
  page?: number;
  hours?: number;
}

export interface FetchResult<T> {
  page: number;
  pageCount: number;
  items: T[];
}

export interface ProviderAdapter {
  readonly code: string;
  readonly name: string;
  readonly baseUrl: string;

  /** 视频列表抓取（必需） */
  fetchPage(opts: FetchOptions): Promise<FetchResult<NormalizedVod>>;
  ping(): Promise<boolean>;

  /** 演员同步能力：true 时调度器会调用 fetchActorPage */
  readonly supportsActor?: boolean;
  fetchActorPage?(opts: FetchOptions): Promise<FetchResult<NormalizedActor>>;

  /** 资讯同步能力：true 时调度器会调用 fetchArticlePage */
  readonly supportsArticle?: boolean;
  fetchArticlePage?(opts: FetchOptions): Promise<FetchResult<NormalizedArticle>>;
}
