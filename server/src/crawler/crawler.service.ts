import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  Prisma,
  SyncEntity,
  SyncStateStatus,
  SyncStatus,
  SyncType,
  ProviderStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PROVIDER_REGISTRY, ProviderRegistry } from "../providers/providers.module";
import type { NormalizedVod, ProviderAdapter } from "../providers/provider.interface";
import { BaseAppleCmsProvider } from "../providers/base-apple-cms.provider";
import { ScoringService } from "../scoring/scoring.service";
import type { NormalizedActor, NormalizedArticle } from "../apple-cms/apple-cms.parser";

interface RunOptions {
  type: SyncType;
  pages?: number;
  hours?: number;
  providerCode?: string;
  skipActor?: boolean;
  skipArticle?: boolean;
  actorPages?: number;
  articlePages?: number;
  /** true 时忽略 sync_state，从 page=1 重头开始（重置进度） */
  restart?: boolean;
}

interface RunSummary {
  ok: boolean;
  itemsSeen: number;
  videosAdded: number;
  videosUpdated: number;
  sourcesAdded: number;
  actorsAdded: number;
  actorsUpdated: number;
  articlesAdded: number;
  articlesUpdated: number;
}

// 页级 retry 配置
const PAGE_MAX_RETRY = 3;
const RETRY_BACKOFF_MS = [1_000, 3_000, 8_000];

// 连续多少页失败就把 sync_state 置为 PAUSED，等下轮 cron 续跑
const PAUSE_AFTER_CONSECUTIVE_FAILURES = 3;

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    @Inject(PROVIDER_REGISTRY) private readonly registry: ProviderRegistry,
  ) {}

  async ensureProvidersSeeded(): Promise<void> {
    for (const p of this.registry) {
      await this.prisma.provider.upsert({
        where: { code: p.code },
        create: { code: p.code, name: p.name, baseUrl: p.baseUrl },
        update: { name: p.name, baseUrl: p.baseUrl },
      });
    }
  }

  @Cron(process.env.SYNC_INCREMENTAL_CRON ?? "*/10 * * * *", { name: "incremental-sync" })
  async scheduledIncrementalSync(): Promise<void> {
    if (this.running) {
      this.logger.warn("上一轮同步未结束，跳过本轮");
      return;
    }
    await this.runAll({
      type: SyncType.INCREMENTAL,
      pages: Number(process.env.SYNC_PAGES_PER_RUN ?? 10),
      hours: Number(process.env.SYNC_HOURS_BACK ?? 1),
    });
  }

  async runAll(opts: RunOptions): Promise<Record<string, RunSummary>> {
    await this.ensureProvidersSeeded();
    this.running = true;
    const result: Record<string, RunSummary> = {};
    try {
      const targets = this.registry.filter(
        (p) => !opts.providerCode || p.code === opts.providerCode,
      );
      for (const provider of targets) {
        result[provider.code] = await this.runOne(provider, opts);
      }
    } finally {
      this.running = false;
    }
    return result;
  }

  private async runOne(provider: ProviderAdapter, opts: RunOptions): Promise<RunSummary> {
    const dbProvider = await this.prisma.provider.findUnique({ where: { code: provider.code } });
    if (!dbProvider || dbProvider.status !== ProviderStatus.ACTIVE) {
      this.logger.warn(`provider ${provider.code} 未启用，跳过`);
      return emptySummary();
    }

    const summary = emptySummary();

    const v = await this.runVideoSync(provider, dbProvider.id, opts);
    Object.assign(summary, v);

    if (provider.supportsActor && provider.fetchActorPage && !opts.skipActor) {
      const a = await this.runActorSync(provider, dbProvider.id, opts);
      summary.actorsAdded = a.added;
      summary.actorsUpdated = a.updated;
    }

    if (provider.supportsArticle && provider.fetchArticlePage && !opts.skipArticle) {
      const a = await this.runArticleSync(provider, dbProvider.id, opts);
      summary.articlesAdded = a.added;
      summary.articlesUpdated = a.updated;
    }

    await this.prisma.provider.update({
      where: { id: dbProvider.id },
      data: { lastSyncAt: new Date() },
    });

    if (opts.type === SyncType.FULL && summary.ok) {
      await this.scoring.scoreAll();
    }

    return summary;
  }

  // ============================================================
  // 通用工具：sync_state 读写 + 页级 retry
  // ============================================================

  private async getOrInitSyncState(providerId: number, entity: SyncEntity) {
    return this.prisma.syncState.upsert({
      where: { providerId_entity: { providerId, entity } },
      create: { providerId, entity, status: SyncStateStatus.IDLE },
      update: {},
    });
  }

  private async markSyncStateRunning(stateId: string) {
    await this.prisma.syncState.update({
      where: { id: stateId },
      data: { status: SyncStateStatus.RUNNING, startedAt: new Date(), consecutiveFailures: 0, lastError: null },
    });
  }

  private async updateSyncStateProgress(
    stateId: string,
    page: number,
    pageCount: number,
  ) {
    await this.prisma.syncState.update({
      where: { id: stateId },
      data: { lastCompletedPage: page, pageCount, consecutiveFailures: 0 },
    });
  }

  private async markSyncStateCompleted(stateId: string) {
    await this.prisma.syncState.update({
      where: { id: stateId },
      data: { status: SyncStateStatus.COMPLETED, finishedAt: new Date(), lastError: null },
    });
  }

  private async markSyncStatePaused(stateId: string, error: string) {
    await this.prisma.syncState.update({
      where: { id: stateId },
      data: {
        status: SyncStateStatus.PAUSED,
        lastError: error.slice(0, 1000),
      },
    });
  }

  private async incrementConsecutiveFailures(stateId: string, error: string) {
    return this.prisma.syncState.update({
      where: { id: stateId },
      data: {
        consecutiveFailures: { increment: 1 },
        lastError: error.slice(0, 1000),
      },
    });
  }

  /** 单页抓取，自带 3 次指数退避重试。返回 result 或 null（仍失败） */
  private async fetchPageWithRetry<R>(
    label: string,
    fetcher: () => Promise<R>,
  ): Promise<{ result: R | null; lastError: string | null }> {
    let lastError: string | null = null;
    for (let attempt = 0; attempt <= PAGE_MAX_RETRY; attempt++) {
      try {
        const result = await fetcher();
        if (attempt > 0) this.logger.log(`[${label}] 重试第 ${attempt} 次成功`);
        return { result, lastError: null };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < PAGE_MAX_RETRY) {
          const wait = RETRY_BACKOFF_MS[attempt] ?? 8_000;
          this.logger.warn(`[${label}] 第 ${attempt + 1}/${PAGE_MAX_RETRY + 1} 次失败: ${lastError} · ${wait}ms 后重试`);
          await sleep(wait);
        } else {
          this.logger.error(`[${label}] 重试用尽，仍失败: ${lastError}`);
        }
      }
    }
    return { result: null, lastError };
  }

  // ============================================================
  // 视频同步（断点续传）
  // ============================================================

  private async runVideoSync(
    provider: ProviderAdapter,
    providerId: number,
    opts: RunOptions,
  ): Promise<RunSummary> {
    const startedAt = new Date();
    // 增量模式：滚动窗口（hours=N），与 sync_state 断点续传无关，全程不读不写 state
    const trackState = opts.type !== SyncType.INCREMENTAL;
    const state = trackState
      ? await this.getOrInitSyncState(providerId, SyncEntity.VIDEO)
      : null;

    // 决定起点 page：
    //   - 增量：永远从 1 开始（拿 hours 窗口）
    //   - restart=true 或 上次 COMPLETED：从 1 开始
    //   - 否则从 lastCompletedPage+1 续传
    const resumeFromCompleted = state?.status === SyncStateStatus.COMPLETED;
    const startPage =
      !trackState || opts.restart || resumeFromCompleted
        ? 1
        : (state?.lastCompletedPage ?? 0) + 1;

    if (state && (opts.restart || resumeFromCompleted)) {
      await this.prisma.syncState.update({
        where: { id: state.id },
        data: { lastCompletedPage: 0, pageCount: 0 },
      });
    }

    if (state) await this.markSyncStateRunning(state.id);

    const log = await this.prisma.syncLog.create({
      data: { providerId, entity: SyncEntity.VIDEO, type: opts.type, status: SyncStatus.RUNNING },
    });

    const summary = emptySummary();
    const maxPages = opts.pages ?? (opts.type === SyncType.FULL ? 9999 : 10);
    const endPage = startPage + maxPages - 1;
    let page = startPage;
    let pageCount = state?.pageCount || 1;
    let pagesFetched = 0;
    let consecutiveFailures = state?.consecutiveFailures ?? 0;

    if (trackState && startPage > 1) {
      this.logger.log(
        `[${provider.code}] video 续传：从 page ${startPage} 开始（上次完成到 ${state?.lastCompletedPage}）`,
      );
    }

    while (page <= pageCount && page <= endPage) {
      const { result, lastError } = await this.fetchPageWithRetry(
        `${provider.code} video page ${page}`,
        () => provider.fetchPage({ page, hours: opts.hours }),
      );

      if (!result) {
        consecutiveFailures++;
        if (state) await this.incrementConsecutiveFailures(state.id, lastError ?? "unknown");
        if (consecutiveFailures >= PAUSE_AFTER_CONSECUTIVE_FAILURES) {
          if (state) {
            await this.markSyncStatePaused(state.id, lastError ?? "unknown");
            this.logger.warn(
              `[${provider.code}] video 连续 ${consecutiveFailures} 页失败，暂停同步 · 下轮 cron 自动续传（page=${page}）`,
            );
          }
          break;
        }
        page++;
        continue;
      }

      consecutiveFailures = 0;
      pageCount = result.pageCount;
      pagesFetched++;
      summary.itemsSeen += result.items.length;

      for (const vod of result.items) {
        try {
          const delta = await this.upsertVod(providerId, vod);
          summary.videosAdded += delta.videoCreated ? 1 : 0;
          summary.videosUpdated += delta.videoCreated ? 0 : 1;
          summary.sourcesAdded += delta.sourceCreated ? 1 : 0;
        } catch (e) {
          // 单条 vod upsert 失败不阻塞，记录后继续
          this.logger.warn(
            `[${provider.code}] upsert vod 失败 (${vod.title}): ${e instanceof Error ? e.message : e}`,
          );
        }
      }

      if (state) await this.updateSyncStateProgress(state.id, page, pageCount);

      this.logger.log(`[${provider.code}] video page ${page}/${pageCount} 处理 ${result.items.length} 条`);
      page++;
    }

    const completed = page > pageCount && pagesFetched > 0;
    const isPaused =
      consecutiveFailures >= PAUSE_AFTER_CONSECUTIVE_FAILURES ||
      (pagesFetched === 0 && consecutiveFailures > 0);

    if (state) {
      if (isPaused) {
        const cur = await this.prisma.syncState.findUnique({ where: { id: state.id } });
        if (cur && cur.status !== SyncStateStatus.PAUSED) {
          await this.markSyncStatePaused(state.id, "页面拉取连续失败");
        }
      } else if (completed) {
        await this.markSyncStateCompleted(state.id);
        this.logger.log(`[${provider.code}] video 全量同步完成（${pageCount} 页）`);
      } else {
        await this.prisma.syncState.update({
          where: { id: state.id },
          data: { status: SyncStateStatus.IDLE },
        });
      }
    }
    summary.ok = !isPaused;

    await this.prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: isPaused ? SyncStatus.FAILED : SyncStatus.SUCCESS,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        pagesFetched,
        itemsSeen: summary.itemsSeen,
        videosAdded: summary.videosAdded,
        videosUpdated: summary.videosUpdated,
        sourcesAdded: summary.sourcesAdded,
        errorMessage: isPaused ? `连续 ${consecutiveFailures} 页失败暂停 @ page ${page}` : null,
      },
    });

    return summary;
  }

  // ============================================================
  // 演员同步（断点续传）
  // ============================================================

  private async runActorSync(
    provider: ProviderAdapter,
    providerId: number,
    opts: RunOptions,
  ): Promise<{ added: number; updated: number }> {
    const startedAt = new Date();
    const trackState = opts.type !== SyncType.INCREMENTAL;
    const state = trackState
      ? await this.getOrInitSyncState(providerId, SyncEntity.ACTOR)
      : null;
    const resumeFromCompleted = state?.status === SyncStateStatus.COMPLETED;
    const startPage =
      !trackState || opts.restart || resumeFromCompleted
        ? 1
        : (state?.lastCompletedPage ?? 0) + 1;

    if (state && (opts.restart || resumeFromCompleted)) {
      await this.prisma.syncState.update({
        where: { id: state.id },
        data: { lastCompletedPage: 0, pageCount: 0 },
      });
    }

    if (state) await this.markSyncStateRunning(state.id);
    const log = await this.prisma.syncLog.create({
      data: { providerId, entity: SyncEntity.ACTOR, type: opts.type, status: SyncStatus.RUNNING },
    });

    let added = 0;
    let updated = 0;
    let itemsSeen = 0;
    let pagesFetched = 0;
    let consecutiveFailures = state?.consecutiveFailures ?? 0;
    const maxPages = opts.actorPages ?? opts.pages ?? (opts.type === SyncType.FULL ? 9999 : 50);
    const endPage = startPage + maxPages - 1;
    let page = startPage;
    let pageCount = state?.pageCount || 1;

    if (trackState && startPage > 1) {
      this.logger.log(`[${provider.code}] actor 续传：从 page ${startPage} 开始`);
    }

    while (page <= pageCount && page <= endPage) {
      const { result, lastError } = await this.fetchPageWithRetry(
        `${provider.code} actor page ${page}`,
        () => provider.fetchActorPage!({ page, hours: opts.hours }),
      );
      if (!result) {
        consecutiveFailures++;
        if (state) await this.incrementConsecutiveFailures(state.id, lastError ?? "unknown");
        if (consecutiveFailures >= PAUSE_AFTER_CONSECUTIVE_FAILURES) {
          if (state) await this.markSyncStatePaused(state.id, lastError ?? "unknown");
          break;
        }
        page++;
        continue;
      }
      consecutiveFailures = 0;
      pageCount = result.pageCount;
      pagesFetched++;
      itemsSeen += result.items.length;

      for (const actor of result.items) {
        try {
          const r = await this.upsertActor(provider.code, actor);
          if (r.created) added++;
          else updated++;
        } catch (e) {
          this.logger.warn(`[${provider.code}] upsert actor 失败: ${e instanceof Error ? e.message : e}`);
        }
      }
      if (state) await this.updateSyncStateProgress(state.id, page, pageCount);
      this.logger.log(`[${provider.code}] actor page ${page}/${pageCount} 处理 ${result.items.length} 条`);
      if (result.items.length === 0) break;
      page++;
    }

    const completed = page > pageCount && pagesFetched > 0;
    const isPaused =
      consecutiveFailures >= PAUSE_AFTER_CONSECUTIVE_FAILURES ||
      (pagesFetched === 0 && consecutiveFailures > 0);

    if (state) {
      if (isPaused) {
        const cur = await this.prisma.syncState.findUnique({ where: { id: state.id } });
        if (cur && cur.status !== SyncStateStatus.PAUSED) {
          await this.markSyncStatePaused(state.id, "页面拉取连续失败");
        }
      } else if (completed) {
        await this.markSyncStateCompleted(state.id);
      } else {
        await this.prisma.syncState.update({
          where: { id: state.id },
          data: { status: SyncStateStatus.IDLE },
        });
      }
    }

    await this.prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: isPaused ? SyncStatus.FAILED : SyncStatus.SUCCESS,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        pagesFetched,
        itemsSeen,
        actorsAdded: added,
        actorsUpdated: updated,
        errorMessage: isPaused ? `连续 ${consecutiveFailures} 页失败暂停 @ page ${page}` : null,
      },
    });

    return { added, updated };
  }

  private async upsertActor(
    providerCode: string,
    a: NormalizedActor,
  ): Promise<{ created: boolean }> {
    const existing = await this.prisma.actor.findUnique({ where: { externalKey: a.externalKey } });
    const created = !existing;

    const data: Prisma.ActorUncheckedUpdateInput = {
      name: a.name,
      sourceUpdatedAt: a.sourceUpdatedAt ?? existing?.sourceUpdatedAt ?? null,
      lastSyncedAt: new Date(),
      providerCode,
      providerActorId: a.providerActorId,
      ...(existing && !existing.alias && a.alias ? { alias: a.alias } : {}),
      ...(existing && !existing.sex && a.sex ? { sex: a.sex } : {}),
      ...(existing && !existing.area && a.area ? { area: a.area } : {}),
      ...(existing && !existing.height && a.height ? { height: a.height } : {}),
      ...(existing && !existing.weight && a.weight ? { weight: a.weight } : {}),
      ...(existing && !existing.birthday && a.birthday ? { birthday: a.birthday } : {}),
      ...(existing && !existing.birthplace && a.birthplace ? { birthplace: a.birthplace } : {}),
      ...(existing && !existing.bloodType && a.bloodType ? { bloodType: a.bloodType } : {}),
      ...(existing && !existing.starSign && a.starSign ? { starSign: a.starSign } : {}),
      ...(existing && !existing.school && a.school ? { school: a.school } : {}),
      ...(existing && !existing.works && a.works ? { works: a.works } : {}),
      ...(existing && !existing.cover && a.cover ? { cover: a.cover } : {}),
      ...(existing && !existing.blurb && a.blurb ? { blurb: a.blurb } : {}),
      ...(existing && !existing.remarks && a.remarks ? { remarks: a.remarks } : {}),
    };

    await this.prisma.actor.upsert({
      where: { externalKey: a.externalKey },
      create: {
        externalKey: a.externalKey,
        name: a.name,
        alias: a.alias,
        sex: a.sex,
        area: a.area,
        height: a.height,
        weight: a.weight,
        birthday: a.birthday,
        birthplace: a.birthplace,
        bloodType: a.bloodType,
        starSign: a.starSign,
        school: a.school,
        works: a.works,
        cover: a.cover,
        blurb: a.blurb,
        remarks: a.remarks,
        providerCode,
        providerActorId: a.providerActorId,
        sourceUpdatedAt: a.sourceUpdatedAt,
        lastSyncedAt: new Date(),
      },
      update: data,
    });

    return { created };
  }

  // ============================================================
  // 资讯同步（断点续传）
  // ============================================================

  private async runArticleSync(
    provider: ProviderAdapter,
    providerId: number,
    opts: RunOptions,
  ): Promise<{ added: number; updated: number }> {
    const startedAt = new Date();
    const trackState = opts.type !== SyncType.INCREMENTAL;
    const state = trackState
      ? await this.getOrInitSyncState(providerId, SyncEntity.ARTICLE)
      : null;
    const resumeFromCompleted = state?.status === SyncStateStatus.COMPLETED;
    const startPage =
      !trackState || opts.restart || resumeFromCompleted
        ? 1
        : (state?.lastCompletedPage ?? 0) + 1;

    if (state && (opts.restart || resumeFromCompleted)) {
      await this.prisma.syncState.update({
        where: { id: state.id },
        data: { lastCompletedPage: 0, pageCount: 0 },
      });
    }

    if (state) await this.markSyncStateRunning(state.id);
    const log = await this.prisma.syncLog.create({
      data: { providerId, entity: SyncEntity.ARTICLE, type: opts.type, status: SyncStatus.RUNNING },
    });

    let added = 0;
    let updated = 0;
    let itemsSeen = 0;
    let pagesFetched = 0;
    let consecutiveFailures = state?.consecutiveFailures ?? 0;
    const maxPages = opts.articlePages ?? opts.pages ?? (opts.type === SyncType.FULL ? 9999 : 20);
    const endPage = startPage + maxPages - 1;
    let page = startPage;
    let pageCount = state?.pageCount || 1;

    if (trackState && startPage > 1) {
      this.logger.log(`[${provider.code}] article 续传：从 page ${startPage} 开始`);
    }

    while (page <= pageCount && page <= endPage) {
      const { result, lastError } = await this.fetchPageWithRetry(
        `${provider.code} article page ${page}`,
        () => provider.fetchArticlePage!({ page, hours: opts.hours }),
      );
      if (!result) {
        consecutiveFailures++;
        if (state) await this.incrementConsecutiveFailures(state.id, lastError ?? "unknown");
        if (consecutiveFailures >= PAUSE_AFTER_CONSECUTIVE_FAILURES) {
          if (state) await this.markSyncStatePaused(state.id, lastError ?? "unknown");
          break;
        }
        page++;
        continue;
      }
      consecutiveFailures = 0;
      pageCount = result.pageCount;
      pagesFetched++;
      itemsSeen += result.items.length;

      for (const art of result.items) {
        try {
          const r = await this.upsertArticle(provider.code, art);
          if (r.created) added++;
          else updated++;
        } catch (e) {
          this.logger.warn(`[${provider.code}] upsert article 失败: ${e instanceof Error ? e.message : e}`);
        }
      }
      if (state) await this.updateSyncStateProgress(state.id, page, pageCount);
      this.logger.log(`[${provider.code}] article page ${page}/${pageCount} 处理 ${result.items.length} 条`);
      if (result.items.length === 0) break;
      page++;
    }

    const completed = page > pageCount && pagesFetched > 0;
    const isPaused =
      consecutiveFailures >= PAUSE_AFTER_CONSECUTIVE_FAILURES ||
      (pagesFetched === 0 && consecutiveFailures > 0);

    if (state) {
      if (isPaused) {
        const cur = await this.prisma.syncState.findUnique({ where: { id: state.id } });
        if (cur && cur.status !== SyncStateStatus.PAUSED) {
          await this.markSyncStatePaused(state.id, "页面拉取连续失败");
        }
      } else if (completed) {
        await this.markSyncStateCompleted(state.id);
      } else {
        await this.prisma.syncState.update({
          where: { id: state.id },
          data: { status: SyncStateStatus.IDLE },
        });
      }
    }

    await this.prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: isPaused ? SyncStatus.FAILED : SyncStatus.SUCCESS,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        pagesFetched,
        itemsSeen,
        articlesAdded: added,
        articlesUpdated: updated,
        errorMessage: isPaused ? `连续 ${consecutiveFailures} 页失败暂停 @ page ${page}` : null,
      },
    });

    return { added, updated };
  }

  private async upsertArticle(
    providerCode: string,
    a: NormalizedArticle,
  ): Promise<{ created: boolean }> {
    const where = {
      providerCode_providerArtId: { providerCode, providerArtId: a.providerArtId },
    };
    const existing = await this.prisma.article.findUnique({ where });

    await this.prisma.article.upsert({
      where,
      create: {
        providerCode,
        providerArtId: a.providerArtId,
        title: a.title,
        subtitle: a.subtitle,
        typeName: a.typeName,
        author: a.author,
        fromSite: a.fromSite,
        cover: a.cover,
        picSlide: a.picSlide,
        blurb: a.blurb,
        content: a.content,
        jumpUrl: a.jumpUrl,
        score: a.score,
        hits: a.hits,
        upVotes: a.upVotes,
        downVotes: a.downVotes,
        remarks: a.remarks,
        sourceUpdatedAt: a.sourceUpdatedAt,
        lastSyncedAt: new Date(),
      },
      update: {
        title: a.title,
        subtitle: a.subtitle,
        typeName: a.typeName,
        author: a.author,
        fromSite: a.fromSite,
        ...(existing && !existing.cover && a.cover ? { cover: a.cover } : {}),
        ...(existing && !existing.picSlide && a.picSlide ? { picSlide: a.picSlide } : {}),
        ...(existing && !existing.blurb && a.blurb ? { blurb: a.blurb } : {}),
        ...(existing && !existing.content && a.content ? { content: a.content } : {}),
        ...(existing && !existing.jumpUrl && a.jumpUrl ? { jumpUrl: a.jumpUrl } : {}),
        score: a.score,
        hits: a.hits,
        upVotes: a.upVotes,
        downVotes: a.downVotes,
        remarks: a.remarks ?? existing?.remarks ?? null,
        sourceUpdatedAt: a.sourceUpdatedAt ?? existing?.sourceUpdatedAt ?? null,
        lastSyncedAt: new Date(),
      },
    });

    return { created: !existing };
  }

  // ============================================================
  // video upsert（保持原逻辑）
  // ============================================================

  private async upsertVod(
    providerId: number,
    vod: NormalizedVod,
  ): Promise<{ videoCreated: boolean; sourceCreated: boolean }> {
    const externalKey = BaseAppleCmsProvider.externalKeyOf(vod);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.video.findUnique({ where: { externalKey } });
      // soft-deleted 视频不再被同步唤醒（admin 永久删除语义）
      if (existing && existing.status === "DELETED") {
        return { videoCreated: false, sourceCreated: false };
      }
      const videoCreated = !existing;

      const videoData: Prisma.VideoUpsertArgs["create"] = {
        externalKey,
        title: vod.title,
        originalTitle: vod.originalTitle ?? null,
        category: vod.category,
        year: vod.year,
        region: vod.region,
        cover: vod.cover,
        backdrop: vod.backdrop,
        description: vod.description,
        director: vod.director,
        actors: vod.actors,
        genres: vod.genres,
        remarks: vod.remarks,
        score: vod.score,
        sourceUpdatedAt: vod.sourceUpdatedAt,
        lastSyncedAt: new Date(),
      };

      const video = await tx.video.upsert({
        where: { externalKey },
        create: videoData,
        update: {
          title: vod.title,
          remarks: vod.remarks,
          sourceUpdatedAt: vod.sourceUpdatedAt ?? existing?.sourceUpdatedAt,
          lastSyncedAt: new Date(),
          ...(existing && !existing.description && vod.description ? { description: vod.description } : {}),
          ...(existing && !existing.cover && vod.cover ? { cover: vod.cover } : {}),
          ...(existing && !existing.backdrop && vod.backdrop ? { backdrop: vod.backdrop } : {}),
          ...(existing && existing.score === 0 && vod.score > 0 ? { score: vod.score } : {}),
          ...(existing && existing.category === "unknown" && vod.category !== "unknown" ? { category: vod.category } : {}),
          ...(existing && !existing.region && vod.region ? { region: vod.region } : {}),
          ...(existing && !existing.year && vod.year ? { year: vod.year } : {}),
          ...(existing && (existing.genres?.length ?? 0) === 0 && vod.genres.length > 0 ? { genres: vod.genres } : {}),
        },
      });

      const maxEpisodes = Math.max(...vod.sources.map((s) => s.episodes.length));
      const epRows = await tx.episode.findMany({ where: { videoId: video.id } });
      const epByIndex = new Map(epRows.map((e) => [e.index, e]));

      for (let i = 0; i < maxEpisodes; i++) {
        if (epByIndex.has(i)) continue;
        const sample = vod.sources.find((s) => s.episodes[i])?.episodes[i];
        if (!sample) continue;
        const created = await tx.episode.create({
          data: { videoId: video.id, index: i, name: sample.name },
        });
        epByIndex.set(i, created);
      }

      let sourceCreated = false;
      for (const ns of vod.sources) {
        const existed = await tx.source.findUnique({
          where: {
            videoId_providerId_playFromCode: {
              videoId: video.id,
              providerId,
              playFromCode: ns.playFromCode,
            },
          },
        });
        const source = await tx.source.upsert({
          where: {
            videoId_providerId_playFromCode: {
              videoId: video.id,
              providerId,
              playFromCode: ns.playFromCode,
            },
          },
          create: {
            videoId: video.id,
            providerId,
            providerVodId: vod.providerVodId,
            playFromCode: ns.playFromCode,
            sourceName: ns.sourceName,
            lineName: ns.lineName,
            quality: ns.quality,
            totalEpisodes: ns.totalEpisodes,
            isActive: true,
          },
          update: {
            providerVodId: vod.providerVodId,
            sourceName: ns.sourceName,
            lineName: ns.lineName,
            quality: ns.quality,
            totalEpisodes: ns.totalEpisodes,
            isActive: true,
          },
        });
        if (!existed) sourceCreated = true;

        for (const ep of ns.episodes) {
          const epRow = epByIndex.get(ep.index);
          if (!epRow) continue;
          await tx.sourceEpisode.upsert({
            where: { sourceId_episodeId: { sourceId: source.id, episodeId: epRow.id } },
            create: { sourceId: source.id, episodeId: epRow.id, m3u8Url: ep.m3u8Url },
            update: { m3u8Url: ep.m3u8Url, isValid: true },
          });
        }
      }

      return { videoCreated, sourceCreated };
    });
  }
}

function emptySummary(): RunSummary {
  return {
    ok: false,
    itemsSeen: 0,
    videosAdded: 0,
    videosUpdated: 0,
    sourcesAdded: 0,
    actorsAdded: 0,
    actorsUpdated: 0,
    articlesAdded: 0,
    articlesUpdated: 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
