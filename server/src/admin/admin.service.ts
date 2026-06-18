import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, ProviderStatus, SyncEntity, SyncStatus, SyncType, VideoStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CrawlerService } from "../crawler/crawler.service";
import { AdminLogService } from "./admin-log.service";
import { SearchService } from "../search/search.service";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function pageArgs(page?: number, limit?: number) {
  const pg = Math.max(1, Math.floor(page ?? 1));
  const lm = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit ?? DEFAULT_LIMIT)));
  return { skip: (pg - 1) * lm, take: lm, page: pg, limit: lm };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawler: CrawlerService,
    private readonly adminLog: AdminLogService,
    private readonly searchSvc: SearchService,
  ) {}

  async reindexSearch() {
    const r = await this.searchSvc.reindexAll();
    await this.adminLog.log({ action: "SEARCH_REINDEX", target: "meilisearch", detail: r });
    return r;
  }

  searchStats() {
    return this.searchSvc.stats();
  }

  // ---------- 仪表盘 ----------
  async stats() {
    const [
      videos,
      actors,
      articles,
      sources,
      providers,
      lastVideoSync,
      lastActorSync,
      lastArticleSync,
      recentSyncs,
    ] = await Promise.all([
      this.prisma.video.count(),
      this.prisma.actor.count(),
      this.prisma.article.count(),
      this.prisma.source.count(),
      this.prisma.provider.count({ where: { status: "ACTIVE" } }),
      this.prisma.syncLog.findFirst({
        where: { entity: SyncEntity.VIDEO, status: SyncStatus.SUCCESS },
        orderBy: { finishedAt: "desc" },
      }),
      this.prisma.syncLog.findFirst({
        where: { entity: SyncEntity.ACTOR, status: SyncStatus.SUCCESS },
        orderBy: { finishedAt: "desc" },
      }),
      this.prisma.syncLog.findFirst({
        where: { entity: SyncEntity.ARTICLE, status: SyncStatus.SUCCESS },
        orderBy: { finishedAt: "desc" },
      }),
      this.prisma.syncLog.findMany({
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { provider: { select: { code: true, name: true } } },
      }),
    ]);

    return {
      counters: {
        videos,
        actors,
        articles,
        sources,
        providers,
        // 流量类暂无数据源，占位 0（前端会显示"待接入"）
        pv: null,
        uv: null,
        ip: null,
        dau: null,
      },
      lastSync: {
        video: lastVideoSync?.finishedAt ?? null,
        actor: lastActorSync?.finishedAt ?? null,
        article: lastArticleSync?.finishedAt ?? null,
      },
      recentSyncs: recentSyncs.map((s) => ({
        id: s.id,
        provider: s.provider.code,
        providerName: s.provider.name,
        entity: s.entity,
        type: s.type,
        status: s.status,
        startedAt: s.startedAt,
        durationMs: s.durationMs,
        itemsSeen: s.itemsSeen,
        videosAdded: s.videosAdded,
        actorsAdded: s.actorsAdded,
        articlesAdded: s.articlesAdded,
      })),
    };
  }

  // ---------- 视频管理 ----------
  async videos(params: {
    q?: string;
    category?: string;
    region?: string;
    year?: string;
    status?: string;  // PUBLISHED / UNPUBLISHED / DELETED / "all"
    page?: number;
    limit?: number;
  }) {
    const { skip, take, page, limit } = pageArgs(params.page, params.limit);
    const where: Prisma.VideoWhereInput = {};
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: "insensitive" } },
        { originalTitle: { contains: params.q, mode: "insensitive" } },
      ];
    }
    if (params.category) where.category = params.category as Prisma.VideoWhereInput["category"];
    if (params.region) where.region = params.region;
    if (params.year) {
      const y = Number(params.year);
      if (Number.isFinite(y)) where.year = y;
    }
    // 后台默认 PUBLISHED + UNPUBLISHED（隐藏 DELETED）；status="all" 显示全部
    if (params.status && params.status !== "all") {
      where.status = params.status as VideoStatus;
    } else if (!params.status) {
      where.status = { in: [VideoStatus.PUBLISHED, VideoStatus.UNPUBLISHED] };
    }

    const [rows, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        orderBy: [{ sourceUpdatedAt: "desc" }],
        skip,
        take,
        select: {
          id: true,
          title: true,
          originalTitle: true,
          category: true,
          region: true,
          year: true,
          cover: true,
          remarks: true,
          score: true,
          status: true,
          playCount: true,
          sourceUpdatedAt: true,
          updatedAt: true,
          _count: { select: { sources: true, episodes: true } },
        },
      }),
      this.prisma.video.count({ where }),
    ]);

    return {
      items: rows.map((v) => ({
        id: v.id,
        title: v.title,
        originalTitle: v.originalTitle,
        category: v.category,
        region: v.region,
        year: v.year,
        cover: v.cover,
        remarks: v.remarks,
        score: v.score,
        status: v.status,
        playCount: v.playCount,
        sources: v._count.sources,
        episodes: v._count.episodes,
        sourceUpdatedAt: v.sourceUpdatedAt,
        updatedAt: v.updatedAt,
      })),
      page,
      limit,
      total,
    };
  }

  // ---------- 演员管理 ----------
  async actors(params: { q?: string; page?: number; limit?: number }) {
    const { skip, take, page, limit } = pageArgs(params.page, params.limit);
    const where: Prisma.ActorWhereInput = {};
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: "insensitive" } },
        { alias: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.actor.findMany({
        where,
        orderBy: [{ sourceUpdatedAt: "desc" }],
        skip,
        take,
        select: {
          id: true,
          name: true,
          alias: true,
          sex: true,
          area: true,
          birthday: true,
          cover: true,
          works: true,
          providerCode: true,
          sourceUpdatedAt: true,
        },
      }),
      this.prisma.actor.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  // ---------- 资讯管理 ----------
  async articles(params: { q?: string; page?: number; limit?: number }) {
    const { skip, take, page, limit } = pageArgs(params.page, params.limit);
    const where: Prisma.ArticleWhereInput = {};
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: "insensitive" } },
        { author: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: [{ sourceUpdatedAt: "desc" }],
        skip,
        take,
        select: {
          id: true,
          title: true,
          typeName: true,
          author: true,
          fromSite: true,
          cover: true,
          score: true,
          hits: true,
          providerCode: true,
          sourceUpdatedAt: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  // ---------- 资源站管理 ----------
  async providers() {
    const list = await this.prisma.provider.findMany({
      orderBy: [{ id: "asc" }],
      include: {
        _count: { select: { sources: true } },
        syncLogs: {
          orderBy: { startedAt: "desc" },
          take: 20,
          select: { entity: true, status: true, finishedAt: true, startedAt: true, videosAdded: true, durationMs: true, errorMessage: true },
        },
      },
    });

    // 聚合每个 provider 的播放 telemetry（success/fail/avgResponseTime）
    const aggs = await this.prisma.source.groupBy({
      by: ["providerId"],
      _sum: { playSuccessCount: true, playFailCount: true, failureCount: true },
      _avg: { avgResponseTimeMs: true },
    });
    const aggByProvider = new Map(aggs.map((a) => [a.providerId, a]));

    return list.map((p) => {
      const recent = p.syncLogs;
      const recentVideo = recent.find((l) => l.entity === SyncEntity.VIDEO);
      const lastError = recent.find((l) => l.status === SyncStatus.FAILED);
      const totals = recent.length;
      const okSync = recent.filter((l) => l.status === SyncStatus.SUCCESS).length;
      const syncSuccessRate = totals > 0 ? Math.round((okSync / totals) * 100) : null;

      const agg = aggByProvider.get(p.id);
      const ps = agg?._sum.playSuccessCount ?? 0;
      const pf = agg?._sum.playFailCount ?? 0;
      const playTotal = ps + pf;
      const playSuccessRate = playTotal > 0 ? Math.round((ps / playTotal) * 100) : null;
      const avgRT = agg?._avg.avgResponseTimeMs ?? null;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        baseUrl: p.baseUrl,
        status: p.status,
        weight: p.weight,
        sources: p._count.sources,
        syncSuccessRate,
        playSuccessRate,
        playSuccessCount: ps,
        playFailCount: pf,
        avgResponseTimeMs: avgRT === null ? null : Math.round(avgRT),
        lastSyncAt: recentVideo?.finishedAt ?? p.lastSyncAt,
        lastDurationMs: recentVideo?.durationMs ?? null,
        lastErrorAt: lastError?.startedAt ?? null,
        lastErrorMessage: lastError?.errorMessage ?? null,
      };
    });
  }

  // ---------- 资源站 写 操作 ----------

  /** 手动触发同步：异步启动 CrawlerService.runAll，立即返回 */
  async triggerSync(code: string, type: "full" | "incremental" = "incremental"): Promise<{ accepted: boolean }> {
    const p = await this.prisma.provider.findUnique({ where: { code } });
    if (!p) throw new NotFoundException(`provider ${code} not found`);
    // 异步启动，不 await（避免阻塞 HTTP 请求）
    const syncType = type === "full" ? SyncType.FULL : SyncType.INCREMENTAL;
    void this.crawler
      .runAll({
        type: syncType,
        providerCode: code,
        pages: type === "full" ? undefined : 10,
        hours: type === "full" ? undefined : 24,
      })
      .catch(() => {});
    await this.adminLog.log({
      action: "TRIGGER_SYNC",
      target: `provider:${code}`,
      detail: { type },
    });
    return { accepted: true };
  }

  /** 启停资源站：ACTIVE / PAUSED */
  async setProviderStatus(code: string, status: ProviderStatus): Promise<{ ok: boolean }> {
    const p = await this.prisma.provider.findUnique({ where: { code } });
    if (!p) throw new NotFoundException(`provider ${code} not found`);
    if (p.status === status) return { ok: true };
    await this.prisma.provider.update({ where: { code }, data: { status } });
    await this.adminLog.log({
      action: "TOGGLE_PROVIDER",
      target: `provider:${code}`,
      detail: { from: p.status, to: status },
    });
    return { ok: true };
  }

  // ---------- 视频 写 操作 ----------

  async setVideoStatus(id: string, status: VideoStatus): Promise<{ ok: boolean }> {
    const v = await this.prisma.video.findUnique({ where: { id }, select: { id: true, title: true, status: true } });
    if (!v) throw new NotFoundException("video not found");
    if (v.status === status) return { ok: true };
    await this.prisma.video.update({ where: { id }, data: { status } });
    await this.adminLog.log({
      action: status === VideoStatus.PUBLISHED ? "PUBLISH" : status === VideoStatus.UNPUBLISHED ? "UNPUBLISH" : "DELETE",
      target: `video:${id} | ${v.title}`,
      detail: { from: v.status, to: status },
    });
    // Meili 增量同步（异步，不阻塞）
    void this.searchSvc.upsertOne(id).catch(() => {});
    return { ok: true };
  }

  async editVideo(
    id: string,
    data: Partial<{
      title: string;
      originalTitle: string | null;
      year: number | null;
      region: string | null;
      remarks: string | null;
      description: string | null;
    }>,
  ): Promise<{ ok: boolean }> {
    const v = await this.prisma.video.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!v) throw new NotFoundException("video not found");
    const allowed: Prisma.VideoUncheckedUpdateInput = {};
    if (data.title !== undefined) allowed.title = data.title;
    if (data.originalTitle !== undefined) allowed.originalTitle = data.originalTitle;
    if (data.year !== undefined) allowed.year = data.year;
    if (data.region !== undefined) allowed.region = data.region;
    if (data.remarks !== undefined) allowed.remarks = data.remarks;
    if (data.description !== undefined) allowed.description = data.description;
    if (Object.keys(allowed).length === 0) throw new BadRequestException("no editable fields provided");
    await this.prisma.video.update({ where: { id }, data: allowed });
    await this.adminLog.log({
      action: "EDIT_VIDEO",
      target: `video:${id} | ${v.title}`,
      detail: allowed,
    });
    void this.searchSvc.upsertOne(id).catch(() => {});
    return { ok: true };
  }

  async bulkUpdateVideos(ids: string[], status: VideoStatus): Promise<{ updated: number }> {
    if (!ids || ids.length === 0) return { updated: 0 };
    const r = await this.prisma.video.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    await this.adminLog.log({
      action: "BULK_UPDATE",
      target: `videos × ${r.count}`,
      detail: { ids: ids.slice(0, 50), status, total: r.count },
    });
    for (const id of ids) {
      void this.searchSvc.upsertOne(id).catch(() => {});
    }
    return { updated: r.count };
  }

  // ---------- 操作日志 ----------

  async adminLogs(params: { action?: string; page?: number; limit?: number }) {
    const { skip, take, page, limit } = pageArgs(params.page, params.limit);
    const where: Prisma.AdminLogWhereInput = {};
    if (params.action) where.action = params.action;

    const [items, total] = await Promise.all([
      this.prisma.adminLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      this.prisma.adminLog.count({ where }),
    ]);
    return {
      items: items.map((l) => ({
        id: l.id,
        actor: l.actor,
        action: l.action,
        target: l.target,
        detail: l.detail,
        ip: l.ip,
        createdAt: l.createdAt,
      })),
      page,
      limit,
      total,
    };
  }

  // ---------- 仪表盘排行 ----------

  async dashboardRankings(opts: { topLimit?: number } = {}) {
    const top = Math.min(100, Math.max(1, opts.topLimit ?? 10));
    const [providersByRate, popularVideos, popularSearches] = await Promise.all([
      this.prisma.source.groupBy({
        by: ["providerId"],
        _sum: { playSuccessCount: true, playFailCount: true },
      }),
      this.prisma.video.findMany({
        where: { status: VideoStatus.PUBLISHED, playCount: { gt: 0 } },
        orderBy: [{ playCount: "desc" }, { score: "desc" }],
        take: top,
        select: { id: true, title: true, category: true, cover: true, playCount: true, score: true },
      }),
      this.prisma.searchLog.findMany({
        orderBy: [{ hits: "desc" }],
        take: top,
        select: { keyword: true, hits: true, lastSearchedAt: true },
      }),
    ]);
    const providers = await this.prisma.provider.findMany({ select: { id: true, code: true, name: true } });
    const byId = new Map(providers.map((p) => [p.id, p]));

    const rateRanking = providersByRate
      .map((r) => {
        const ps = r._sum.playSuccessCount ?? 0;
        const pf = r._sum.playFailCount ?? 0;
        const total = ps + pf;
        const rate = total > 0 ? Math.round((ps / total) * 100) : null;
        const p = byId.get(r.providerId);
        return p
          ? { code: p.code, name: p.name, successRate: rate, total }
          : null;
      })
      .filter((x): x is { code: string; name: string; successRate: number | null; total: number } => !!x)
      .sort((a, b) => (b.successRate ?? -1) - (a.successRate ?? -1));

    return {
      providersByRate: rateRanking,
      popularVideos: popularVideos.map((v, i) => ({
        rank: i + 1,
        id: v.id,
        title: v.title,
        category: v.category,
        cover: v.cover,
        playCount: v.playCount,
        score: v.score,
      })),
      popularSearches: popularSearches.map((s, i) => ({
        rank: i + 1,
        keyword: s.keyword,
        hits: s.hits,
        lastSearchedAt: s.lastSearchedAt,
      })),
    };
  }

  /** 热门演员 Top N（统计每个 actors 元素在 videos 中的出现次数） */
  async popularActors(topLimit = 100): Promise<Array<{ rank: number; name: string; works: number; actor: { id: string; cover: string | null; area: string | null; birthday: string | null } | null }>> {
    const top = Math.min(200, Math.max(1, topLimit));
    // PG 用 unnest 聚合：select unnest(actors) as name, count(*) ...
    const rows: Array<{ name: string; works: bigint }> = await this.prisma.$queryRaw`
      select unnest(actors) as name, count(*)::bigint as works
      from videos
      where status='PUBLISHED'
      group by 1
      order by works desc
      limit ${top}
    `;
    const names = rows.map((r) => r.name);
    const actorRows = await this.prisma.actor.findMany({
      where: { name: { in: names } },
      select: { id: true, name: true, cover: true, area: true, birthday: true },
    });
    const byName = new Map(actorRows.map((a) => [a.name, a]));
    return rows.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      works: Number(r.works),
      actor: byName.get(r.name) ?? null,
    }));
  }

  /** 最近 N 天的每日聚合（PV/UV/IP/DAU/playCount/searches） */
  async dailyStats(days = 7) {
    const since = new Date(Date.now() - days * 86400_000);
    since.setHours(0, 0, 0, 0);
    const rows = await this.prisma.dailyStat.findMany({
      where: { date: { gte: since } },
      orderBy: { date: "asc" },
    });
    // 补齐缺失日期为 0
    const out: Array<{ date: string; pv: number; uv: number; ip: number; dau: number; playCount: number; searches: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const row = rows.find((r) => r.date.toISOString().slice(0, 10) === iso);
      out.push({
        date: iso,
        pv: row?.pv ?? 0,
        uv: row?.uv ?? 0,
        ip: row?.ip ?? 0,
        dau: row?.dau ?? 0,
        playCount: row?.playCount ?? 0,
        searches: row?.searches ?? 0,
      });
    }
    return { days: out };
  }

  // ---------- 线路管理 ----------
  async sources(params: {
    providerCode?: string;
    quality?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { skip, take, page, limit } = pageArgs(params.page, params.limit);
    const where: Prisma.SourceWhereInput = {};
    if (params.providerCode) where.provider = { code: params.providerCode };
    if (params.quality) where.quality = params.quality;
    if (typeof params.active === "boolean") where.isActive = params.active;

    const [rows, total] = await Promise.all([
      this.prisma.source.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take,
        include: {
          provider: { select: { code: true, name: true } },
          video: { select: { id: true, title: true, cover: true } },
        },
      }),
      this.prisma.source.count({ where }),
    ]);

    return {
      items: rows.map((s) => ({
        id: s.id,
        videoId: s.videoId,
        videoTitle: s.video.title,
        videoCover: s.video.cover,
        provider: s.provider.code,
        providerName: s.provider.name,
        playFromCode: s.playFromCode,
        sourceName: s.sourceName,
        lineName: s.lineName,
        quality: s.quality,
        totalEpisodes: s.totalEpisodes,
        score: s.score,
        isActive: s.isActive,
        failureCount: s.failureCount,
        updatedAt: s.updatedAt,
      })),
      page,
      limit,
      total,
    };
  }

  // ---------- 同步任务 ----------
  async syncLogs(params: { entity?: string; status?: string; page?: number; limit?: number }) {
    const { skip, take, page, limit } = pageArgs(params.page, params.limit);
    const where: Prisma.SyncLogWhereInput = {};
    if (params.entity) where.entity = params.entity as SyncEntity;
    if (params.status) where.status = params.status as SyncStatus;

    const [rows, total] = await Promise.all([
      this.prisma.syncLog.findMany({
        where,
        orderBy: [{ startedAt: "desc" }],
        skip,
        take,
        include: { provider: { select: { code: true, name: true } } },
      }),
      this.prisma.syncLog.count({ where }),
    ]);

    return {
      items: rows.map((l) => ({
        id: l.id,
        provider: l.provider.code,
        providerName: l.provider.name,
        entity: l.entity,
        type: l.type,
        status: l.status,
        startedAt: l.startedAt,
        finishedAt: l.finishedAt,
        durationMs: l.durationMs,
        pagesFetched: l.pagesFetched,
        itemsSeen: l.itemsSeen,
        videosAdded: l.videosAdded,
        actorsAdded: l.actorsAdded,
        articlesAdded: l.articlesAdded,
        errorMessage: l.errorMessage,
      })),
      page,
      limit,
      total,
    };
  }

  // ---------- 热门内容 ----------
  async popular(params: { metric?: "score" | "recent"; limit?: number }) {
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(params.limit ?? 30)));
    const orderBy: Prisma.VideoOrderByWithRelationInput[] =
      params.metric === "recent" ? [{ sourceUpdatedAt: "desc" }] : [{ score: "desc" }];

    const rows = await this.prisma.video.findMany({
      orderBy,
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        region: true,
        year: true,
        cover: true,
        score: true,
        remarks: true,
        sourceUpdatedAt: true,
        _count: { select: { sources: true } },
      },
    });

    return rows.map((v, i) => ({
      rank: i + 1,
      id: v.id,
      title: v.title,
      category: v.category,
      region: v.region,
      year: v.year,
      cover: v.cover,
      score: v.score,
      remarks: v.remarks,
      sources: v._count.sources,
      sourceUpdatedAt: v.sourceUpdatedAt,
    }));
  }
}
