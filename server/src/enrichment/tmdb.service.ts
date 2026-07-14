import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * TMDB v3 客户端（api_key 查询参数认证，language=zh-CN）
 * - 429 → sleep 10s 重试，最多 3 次
 * - search 结果缓存 tmdb_cache 7 天（key = normalized(title)|year）
 */
const API = "https://api.themoviedb.org/3";
const TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 7 * 24 * 3600_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface TmdbSearchItem {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string; // movie
  name?: string; // tv
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  popularity?: number;
  vote_count?: number;
}

export interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
  episode_run_time?: number[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  credits?: {
    cast?: Array<{ name: string; order: number }>;
    crew?: Array<{ name: string; job: string }>;
  };
  external_ids?: { imdb_id?: string | null };
  keywords?: {
    keywords?: Array<{ name: string }>; // movie
    results?: Array<{ name: string }>; // tv
  };
}

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);

  constructor(private readonly prisma: PrismaService) {}

  get enabled(): boolean {
    return !!process.env.TMDB_API_KEY;
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T | null> {
    const qs = new URLSearchParams({ api_key: process.env.TMDB_API_KEY!, language: "zh-CN", ...params });
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${API}${path}?${qs}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.status === 429) {
          this.logger.warn(`TMDB 429, sleep 10s (attempt ${attempt})`);
          await sleep(10_000);
          continue;
        }
        if (!res.ok) {
          if (res.status >= 500 && attempt < 3) {
            await sleep(2000);
            continue;
          }
          return null;
        }
        return (await res.json()) as T;
      } catch (e) {
        if (attempt === 3) {
          this.logger.warn(`TMDB request failed: ${e instanceof Error ? e.message : e}`);
          return null;
        }
        await sleep(2000);
      }
    }
    return null;
  }

  static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[\s·:：、,，.。!！?？~～\-_()（）\[\]【】'"]/g, "")
      .trim();
  }

  /**
   * 搜索前清洗 CMS 标题：
   * - 去掉 [电影解说]/【首发】 等方括号标注
   * - 去掉"第X季/第X部"季数后缀（TMDB 剧集按系列名收录）
   * - 去掉"动态漫/普通话版/国语/粤语"等修饰尾巴
   */
  static cleanTitle(title: string): string {
    return title
      .replace(/[\[【][^\]】]*[\]】]/g, "")
      .replace(/第[0-9一二三四五六七八九十百]+[季部]$/g, "")
      .replace(/\s*(动态漫|普通话版?|国语版?|粤语版?|中字|完整版)$/g, "")
      .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧ]+$/g, "")
      .trim();
  }

  /** multi 搜索（带 7 天缓存），过滤出 movie/tv */
  async search(title: string, year?: number | null): Promise<TmdbSearchItem[]> {
    const cacheKey = `${TmdbService.normalizeTitle(title)}|${year ?? ""}`;
    const cached = await this.prisma.tmdbCache.findUnique({ where: { key: cacheKey } });
    if (cached && cached.expiresAt > new Date()) {
      try {
        return JSON.parse(cached.payload) as TmdbSearchItem[];
      } catch {
        /* 缓存损坏走远端 */
      }
    }

    const params: Record<string, string> = { query: title, include_adult: "false" };
    if (year) params.year = String(year);
    const data = await this.get<{ results?: TmdbSearchItem[] }>("/search/multi", params);
    let results = (data?.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv");

    // 带年份没搜到 → 放开年份再试一次（CMS 年份经常不准）
    if (results.length === 0 && year) {
      const retry = await this.get<{ results?: TmdbSearchItem[] }>("/search/multi", { query: title, include_adult: "false" });
      results = (retry?.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv");
    }

    await this.prisma.tmdbCache.upsert({
      where: { key: cacheKey },
      create: { key: cacheKey, payload: JSON.stringify(results), expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
      update: { payload: JSON.stringify(results), expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
    });
    return results;
  }

  /** 详情 + credits + external_ids + keywords 一次取全 */
  async detail(type: "movie" | "tv", id: number): Promise<TmdbDetail | null> {
    return this.get<TmdbDetail>(`/${type}/${id}`, { append_to_response: "credits,external_ids,keywords" });
  }
}
