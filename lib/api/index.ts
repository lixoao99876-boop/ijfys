// 与 lib/mock/videos.ts 同名导出的真实 API 客户端
// 前端 UI 代码不变；只是数据源从静态 mock 换成 NestJS /api/*
//
// 服务端组件直接 await 调用即可；React/Next 的 fetch 在同一渲染内会自动去重。

import { cache } from "react";
import type { Category, Video } from "@/lib/types";

const API_BASE =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api";

const REVALIDATE_HOME = 60;     // 首页缓存 1min
const REVALIDATE_DETAIL = 120;  // 详情缓存 2min
const REVALIDATE_LIST = 60;

async function apiFetch<T>(path: string, revalidate: number): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    if (res.status === 404) throw new ApiNotFound(path);
    throw new Error(`API ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

export class ApiNotFound extends Error {
  constructor(path: string) {
    super(`api 404: ${path}`);
  }
}

// ---------- 聚合端点缓存（render 内复用） ----------

interface HomeResp {
  banner: Video[];
  recent: Video[];
  top: Video[];
  byCategory: Record<Category, Video[]>;
}

const fetchHome = cache(async (): Promise<HomeResp> => {
  return apiFetch<HomeResp>("/home", REVALIDATE_HOME);
});

const fetchVideoDetail = cache(
  async (
    id: string,
  ): Promise<{
    video: Video;
    recommendations: Video[];
    byActor: Video[];
    byDirector: Video[];
    byGenre: Video[];
  }> => {
    return apiFetch(`/video/${encodeURIComponent(id)}`, REVALIDATE_DETAIL);
  },
);

// ---------- Phase 5：多维度推荐 ----------

export interface VideoRecommendations {
  byActor: Video[];
  byDirector: Video[];
  byGenre: Video[];
  similar: Video[];
}

export async function fetchRecommendationsForVideo(id: string): Promise<VideoRecommendations> {
  return apiFetch(`/recommend/video/${encodeURIComponent(id)}`, REVALIDATE_DETAIL);
}

export async function fetchPopularRecommendations(category?: string, limit = 12): Promise<Video[]> {
  const usp = new URLSearchParams();
  if (category) usp.set("category", category);
  usp.set("limit", String(limit));
  return apiFetch(`/recommend/popular?${usp.toString()}`, REVALIDATE_LIST);
}

// ---------- 专题合集 ----------

export interface CollectionListItem {
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  itemCount: number;
}

export async function listCollections(): Promise<CollectionListItem[]> {
  return apiFetch<CollectionListItem[]>("/collections", REVALIDATE_LIST);
}

export interface CollectionDetail {
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  items: Video[];
}

export async function getCollectionBySlug(slug: string): Promise<CollectionDetail | undefined> {
  try {
    return await apiFetch<CollectionDetail>(`/collection/${encodeURIComponent(slug)}`, REVALIDATE_DETAIL);
  } catch (e) {
    if (e instanceof ApiNotFound) return undefined;
    throw e;
  }
}

const fetchFilters = cache(async (category: Category) => {
  return apiFetch<{ regions: string[]; years: string[]; genres: string[] }>(
    `/filters?category=${category}`,
    REVALIDATE_LIST,
  );
});

// ---------- 与 mock/videos.ts 同名同语义的导出 ----------

export async function getVideoById(id: string): Promise<Video | undefined> {
  try {
    const { video } = await fetchVideoDetail(id);
    return video;
  } catch (e) {
    if (e instanceof ApiNotFound) return undefined;
    throw e;
  }
}

export interface CategoryFilter {
  genre?: string;
  region?: string;
  year?: string;
  sort?: string;
}

export async function getVideosByCategory(
  category: Category,
  filter?: CategoryFilter,
): Promise<Video[]> {
  // 无筛选时复用首页聚合的前 6 条快速路径（缓存命中率高）
  const hasFilter = !!(filter?.genre || filter?.region || filter?.year);
  const sort = filter?.sort ?? "latest";
  if (!hasFilter && sort === "latest") {
    const home = await fetchHome();
    if (home.byCategory[category] && home.byCategory[category].length >= 12) {
      return home.byCategory[category];
    }
  }
  const qs = new URLSearchParams({ category });
  if (filter?.genre) qs.set("genre", filter.genre);
  if (filter?.region) qs.set("region", filter.region);
  if (filter?.year) qs.set("year", filter.year);
  if (filter?.sort) qs.set("sort", filter.sort);
  const r = await apiFetch<{ items: Video[]; total: number }>(
    `/videos?${qs.toString()}`,
    REVALIDATE_LIST,
  );
  return r.items;
}

export async function getRecentVideos(limit = 12): Promise<Video[]> {
  return (await fetchHome()).recent.slice(0, limit);
}

export async function getTopRated(limit = 10): Promise<Video[]> {
  return (await fetchHome()).top.slice(0, limit);
}

export async function getBannerVideos(limit = 5): Promise<Video[]> {
  return (await fetchHome()).banner.slice(0, limit);
}

// ---------- Phase 4：基于 home_channels 配置的首页数据 ----------

export interface ConfiguredChannel {
  code: string;
  title: string;
  kind: "BANNER" | "CUSTOM" | "COLLECTION";
  sortStrategy?: "LATEST" | "SCORE" | "PLAY_COUNT" | "UPCOMING" | "MANUAL";
  categoryFilter: string | null;
  collectionId?: string | null;
  collectionSlug?: string | null;
  order: number;
  enabled: boolean;
  items: Video[];
}

const fetchConfiguredHome = cache(async (): Promise<{ channels: ConfiguredChannel[] }> => {
  return apiFetch<{ channels: ConfiguredChannel[] }>("/home/configured", REVALIDATE_HOME);
});

export function getConfiguredHome(): Promise<{ channels: ConfiguredChannel[] }> {
  return fetchConfiguredHome();
}

// ---------- 演员 ----------

export interface ActorDetail {
  id: string;
  name: string;
  alias: string | null;
  sex: string | null;
  area: string | null;
  height: string | null;
  weight: string | null;
  birthday: string | null;
  birthplace: string | null;
  bloodType: string | null;
  starSign: string | null;
  school: string | null;
  works: string | null;
  cover: string | null;
  blurb: string | null;
}

export async function getActorDetail(
  id: string,
): Promise<{ actor: ActorDetail; works: Video[] } | undefined> {
  try {
    return await apiFetch<{ actor: ActorDetail; works: Video[] }>(
      `/actor/${encodeURIComponent(id)}`,
      REVALIDATE_DETAIL,
    );
  } catch (e) {
    if (e instanceof ApiNotFound) return undefined;
    throw e;
  }
}

export async function listActors(params: { q?: string; page?: number; limit?: number } = {}) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.page) usp.set("page", String(params.page));
  if (params.limit) usp.set("limit", String(params.limit));
  const qs = usp.toString();
  return apiFetch<{
    items: Array<{ id: string; name: string; sex: string | null; area: string | null; cover: string | null; works: string | null; birthday: string | null }>;
    total: number;
    page: number;
    limit: number;
  }>(`/actors${qs ? `?${qs}` : ""}`, REVALIDATE_LIST);
}

// ---------- 文章 ----------

export interface ArticleDetail {
  id: string;
  title: string;
  subtitle: string | null;
  typeName: string | null;
  author: string | null;
  fromSite: string | null;
  cover: string | null;
  picSlide: string | null;
  blurb: string | null;
  content: string | null;
  jumpUrl: string | null;
  score: number;
  hits: number;
  sourceUpdatedAt: string | null;
}

export async function getArticleDetail(
  id: string,
): Promise<
  | {
      article: ArticleDetail;
      prev: { id: string; title: string } | null;
      next: { id: string; title: string } | null;
      related: Array<{ id: string; title: string; cover: string | null; typeName: string | null; sourceUpdatedAt: string | null }>;
    }
  | undefined
> {
  try {
    return await apiFetch(`/article/${encodeURIComponent(id)}`, REVALIDATE_DETAIL);
  } catch (e) {
    if (e instanceof ApiNotFound) return undefined;
    throw e;
  }
}

export async function listArticles(params: { q?: string; type?: string; page?: number; limit?: number } = {}) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.type) usp.set("type", params.type);
  if (params.page) usp.set("page", String(params.page));
  if (params.limit) usp.set("limit", String(params.limit));
  const qs = usp.toString();
  return apiFetch<{
    items: Array<{ id: string; title: string; typeName: string | null; author: string | null; cover: string | null; blurb: string | null; hits: number; sourceUpdatedAt: string | null }>;
    total: number;
    page: number;
    limit: number;
  }>(`/articles${qs ? `?${qs}` : ""}`, REVALIDATE_LIST);
}

export async function searchVideos(keyword: string): Promise<Video[]> {
  const r = await apiFetch<{ items: Video[]; hot: string[] }>(
    `/search?q=${encodeURIComponent(keyword)}`,
    REVALIDATE_LIST,
  );
  return r.items;
}

export async function searchPaged(
  keyword: string,
  page = 1,
  limit = 20,
): Promise<{
  items: Video[];
  hot: string[];
  total: number;
  page: number;
  limit: number;
  actors: Array<{ id: string; name: string; cover: string | null; area: string | null }>;
  articles: Array<{ id: string; title: string; cover: string | null; typeName: string | null }>;
}> {
  return apiFetch(
    `/search?q=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`,
    REVALIDATE_LIST,
  );
}

export async function getRecommendations(video: Video, limit = 12): Promise<Video[]> {
  try {
    const { recommendations } = await fetchVideoDetail(video.id);
    return recommendations.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getVideoWithRecommendations(id: string) {
  try {
    return await fetchVideoDetail(id);
  } catch (e) {
    if (e instanceof ApiNotFound) return undefined;
    throw e;
  }
}

export async function listGenres(category?: Category): Promise<string[]> {
  if (!category) return [];
  return (await fetchFilters(category)).genres;
}

export async function listRegions(category?: Category): Promise<string[]> {
  if (!category) return [];
  return (await fetchFilters(category)).regions;
}

export async function listYears(category?: Category): Promise<string[]> {
  if (!category) return [];
  return (await fetchFilters(category)).years;
}

export { HOT_KEYWORDS } from "./constants";

// ---------- 客户端 telemetry ----------

const TELEMETRY_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** 上报播放线路成功（含首帧响应时间），fire-and-forget */
export function reportPlaySuccess(sourceId: string, responseTimeMs: number): void {
  try {
    fetch(`${TELEMETRY_BASE}/play/${encodeURIComponent(sourceId)}/ok`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseTimeMs }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

/** 上报播放线路失败，fire-and-forget */
export function reportPlayFailure(sourceId: string): void {
  try {
    fetch(`${TELEMETRY_BASE}/play/${encodeURIComponent(sourceId)}/failed`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
