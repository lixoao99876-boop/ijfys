import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { TmdbService, type TmdbSearchItem } from "./tmdb.service";
import { SeoService } from "../seo/seo.service";

/** 匹配打分阈值：title 相似度 + 年份差综合 < 该值判 no_match */
const MATCH_THRESHOLD = 0.55;

/** no_match 重评时清掉历史误匹配残留 */
const CLEAR_FIELDS = {
  tmdbId: null,
  imdbId: null,
  detailedDescription: null,
  directors: null,
  writers: null,
  genresDetailed: null,
  releaseDate: null,
  tmdbRating: null,
  tmdbVoteCount: null,
  runtime: null,
  keywords: null,
  posterTmdb: null,
  backdropTmdb: null,
};
const MAX_RETRIES = 3;
const CONCURRENCY = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** bigram Dice 相似度（对中文标题友好） */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : a.includes(b) || b.includes(a) ? 0.8 : 0;
  const grams = (s: string) => {
    const g = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const k = s.slice(i, i + 2);
      g.set(k, (g.get(k) ?? 0) + 1);
    }
    return g;
  };
  const ga = grams(a);
  const gb = grams(b);
  let overlap = 0;
  for (const [k, c] of ga) overlap += Math.min(c, gb.get(k) ?? 0);
  return (2 * overlap) / (a.length - 1 + b.length - 1);
}

export interface EnrichResult {
  videoId: string;
  status: "ok" | "partial" | "no_match" | "failed";
  matched?: { tmdbId: number; type: string; title: string; score: number };
  fields?: string[];
  error?: string;
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
    private readonly seo: SeoService,
  ) {}

  private get siteUrl(): string {
    return (process.env.PUBLIC_SITE_URL ?? "https://aiskill88.xyz").replace(/\/+$/, "");
  }

  /** title 相似度（中文名 + 原名取高者）+ 年份差惩罚 + 类型不一致重罚（防综艺撞名电影） */
  private scoreCandidate(
    item: TmdbSearchItem,
    normTitle: string,
    year?: number | null,
    expectedType?: "movie" | "tv",
  ): number {
    const cnTitle = TmdbService.normalizeTitle(item.title ?? item.name ?? "");
    const ogTitle = TmdbService.normalizeTitle(item.original_title ?? item.original_name ?? "");
    let s = Math.max(similarity(normTitle, cnTitle), similarity(normTitle, ogTitle));
    const date = item.release_date ?? item.first_air_date;
    if (year && date) {
      const dy = Math.abs(parseInt(date.slice(0, 4), 10) - year);
      if (dy === 0) s += 0.1;
      else if (dy === 1) s -= 0.05;
      else s -= 0.25;
    }
    if (expectedType && item.media_type && item.media_type !== expectedType) s -= 0.35;
    return s;
  }

  private expectedTmdbType(category: string): "movie" | "tv" | undefined {
    if (category === "movie") return "movie";
    if (["tv", "anime", "variety", "short"].includes(category)) return "tv";
    return undefined;
  }

  async enrichOne(videoId: string, opts: { submit?: boolean } = {}): Promise<EnrichResult> {
    const started = Date.now();
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException("video not found");
    if (!this.tmdb.enabled) return { videoId, status: "failed", error: "TMDB_API_KEY not set" };

    const log = async (r: EnrichResult, matchedId?: string) => {
      await this.prisma.enrichmentLog.create({
        data: {
          videoId,
          source: "tmdb",
          ok: r.status === "ok" || r.status === "partial",
          matchedId: matchedId ?? null,
          fields: r.fields ? JSON.stringify(r.fields) : null,
          error: r.error ?? null,
          latency: Date.now() - started,
        },
      });
    };

    try {
      // 1. 搜索（先清洗标题：去季数/方括号标注，失败再用原始标题兜一次）
      const cleaned = TmdbService.cleanTitle(video.title) || video.title;
      let candidates = await this.tmdb.search(cleaned, video.year);
      if (candidates.length === 0 && cleaned !== video.title) {
        candidates = await this.tmdb.search(video.title, video.year);
      }
      if (candidates.length === 0) {
        await this.prisma.video.update({
          where: { id: videoId },
          data: { enrichStatus: "no_match", enrichSource: "tmdb", enrichedAt: new Date(), ...CLEAR_FIELDS },
        });
        const r: EnrichResult = { videoId, status: "no_match", error: "search empty" };
        await log(r);
        return r;
      }

      // 2. 打分选 top1
      const normTitle = TmdbService.normalizeTitle(cleaned);
      const expectedType = this.expectedTmdbType(video.category);
      const scored = candidates
        .map((c) => ({ c, score: this.scoreCandidate(c, normTitle, video.year, expectedType) }))
        .sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (best.score < MATCH_THRESHOLD) {
        await this.prisma.video.update({
          where: { id: videoId },
          data: { enrichStatus: "no_match", enrichSource: "tmdb", enrichedAt: new Date(), ...CLEAR_FIELDS },
        });
        const r: EnrichResult = { videoId, status: "no_match", error: `best score ${best.score.toFixed(2)} < ${MATCH_THRESHOLD}` };
        await log(r, String(best.c.id));
        return r;
      }

      // 3. 详情
      const type = best.c.media_type === "tv" ? "tv" : "movie";
      const detail = await this.tmdb.detail(type, best.c.id);
      if (!detail) {
        await this.prisma.video.update({
          where: { id: videoId },
          data: { enrichStatus: "failed", enrichRetries: { increment: 1 } },
        });
        const r: EnrichResult = { videoId, status: "failed", error: "detail fetch failed" };
        await log(r, String(best.c.id));
        return r;
      }

      // 4. 组装写回字段（不覆盖 CMS 已有基础字段，只写新列；actors/originalTitle 空时保守补）
      const directors = [...new Set((detail.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name))];
      const writers = [
        ...new Set(
          (detail.credits?.crew ?? [])
            .filter((c) => ["Writer", "Screenplay", "Story", "Novel"].includes(c.job))
            .map((c) => c.name),
        ),
      ];
      const genres = (detail.genres ?? []).map((g) => g.name);
      const kw = (detail.keywords?.keywords ?? detail.keywords?.results ?? []).map((k) => k.name);
      const cast = (detail.credits?.cast ?? []).slice(0, 12).map((c) => c.name);
      const releaseRaw = detail.release_date ?? detail.first_air_date;
      const overview = (detail.overview ?? "").trim();

      const data: Record<string, unknown> = {
        tmdbId: detail.id,
        imdbId: detail.external_ids?.imdb_id ?? null,
        detailedDescription: overview || null,
        directors: directors.length ? JSON.stringify(directors) : null,
        writers: writers.length ? JSON.stringify(writers) : null,
        genresDetailed: genres.length ? JSON.stringify(genres) : null,
        releaseDate: releaseRaw ? new Date(releaseRaw) : null,
        tmdbRating: detail.vote_average ?? null,
        tmdbVoteCount: detail.vote_count ?? null,
        runtime: detail.runtime ?? detail.episode_run_time?.[0] ?? null,
        keywords: kw.length ? JSON.stringify(kw) : null,
        posterTmdb: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
        backdropTmdb: detail.backdrop_path ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}` : null,
        enrichedAt: new Date(),
        enrichSource: "tmdb",
      };
      // 保守补空：原名 / 演员
      const ogName = detail.original_title ?? detail.original_name;
      if (!video.originalTitle && ogName && ogName !== video.title) data.originalTitle = ogName;
      if ((video.actors ?? []).length === 0 && cast.length > 0) data.actors = cast;

      // 中文描述不足 → partial（豆瓣兜底候选池）
      const status: EnrichResult["status"] = overview.length >= 50 ? "ok" : "partial";
      data.enrichStatus = status;

      await this.prisma.video.update({ where: { id: videoId }, data });
      const fields = Object.entries(data)
        .filter(([, v]) => v !== null)
        .map(([k]) => k);
      const r: EnrichResult = {
        videoId,
        status,
        matched: { tmdbId: detail.id, type, title: detail.title ?? detail.name ?? "", score: Number(best.score.toFixed(2)) },
        fields,
      };
      await log(r, String(detail.id));
      // 阶段 5 接线：补齐成功 → 通知搜索引擎重抓该详情页（批量跑时由 enrichBatch 聚合提交）
      if (opts.submit !== false) {
        await this.seo
          .submitUrls([`${this.siteUrl}/vod/${videoId}`], { engines: ["bing", "yandex"] })
          .catch((e) => this.logger.warn(`seo submit failed: ${e instanceof Error ? e.message : e}`));
      }
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.prisma.video.update({
        where: { id: videoId },
        data: { enrichStatus: "failed", enrichRetries: { increment: 1 } },
      });
      const r: EnrichResult = { videoId, status: "failed", error: msg };
      await log(r);
      return r;
    }
  }

  /** 批量补齐：未处理 + 失败未超重试上限，并发 3 */
  async enrichBatch(limit = 20): Promise<{ processed: number; ok: number; partial: number; noMatch: number; failed: number }> {
    if (this.running) return { processed: 0, ok: 0, partial: 0, noMatch: 0, failed: 0 };
    this.running = true;
    try {
      const rows = await this.prisma.video.findMany({
        where: {
          status: "PUBLISHED",
          OR: [{ enrichStatus: null }, { enrichStatus: "failed", enrichRetries: { lt: MAX_RETRIES } }],
        },
        select: { id: true },
        orderBy: { playCount: "desc" }, // 热门优先
        take: limit,
      });

      const counter = { processed: 0, ok: 0, partial: 0, noMatch: 0, failed: 0 };
      const enrichedIds: string[] = [];
      let idx = 0;
      const worker = async () => {
        for (;;) {
          const i = idx++;
          if (i >= rows.length) return;
          const r = await this.enrichOne(rows[i].id, { submit: false });
          counter.processed++;
          if (r.status === "ok" || r.status === "partial") enrichedIds.push(rows[i].id);
          if (r.status === "ok") counter.ok++;
          else if (r.status === "partial") counter.partial++;
          else if (r.status === "no_match") counter.noMatch++;
          else counter.failed++;
          await sleep(300); // 礼貌间隔
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (enrichedIds.length > 0) {
        const urls = enrichedIds.map((id) => `${this.siteUrl}/vod/${id}`);
        await this.seo
          .submitUrls(urls, { engines: ["bing", "yandex"] })
          .catch((e) => this.logger.warn(`seo batch submit failed: ${e instanceof Error ? e.message : e}`));
      }
      this.logger.log(`enrichBatch done: ${JSON.stringify(counter)}, submitted ${enrichedIds.length} urls`);
      return counter;
    } finally {
      this.running = false;
    }
  }

  async stats() {
    const grouped = await this.prisma.video.groupBy({
      by: ["enrichStatus"],
      where: { status: "PUBLISHED" },
      _count: true,
    });
    const total = await this.prisma.video.count({ where: { status: "PUBLISHED" } });
    const recentLogs = await this.prisma.enrichmentLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
    return {
      total,
      byStatus: grouped.map((g) => ({ status: g.enrichStatus ?? "pending", count: g._count })),
      running: this.running,
      recentLogs,
    };
  }

  /** 每晚 03:30 补当日新入库（避开 03:00 yandex drain） */
  @Cron("30 3 * * *", { name: "enrichment-daily", timeZone: "Asia/Shanghai" })
  async cronDaily() {
    const res = await this.enrichBatch(200);
    this.logger.log(`enrichment-daily: ${JSON.stringify(res)}`);
  }
}
