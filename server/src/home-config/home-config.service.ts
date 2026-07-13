import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { Category, CoverStatus, HomeChannelKind, HomeSortStrategy, Prisma, VideoStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FULL_VIDEO_INCLUDE, toDTO, type VideoDTO } from "../api/video.mapper";

interface ChannelOutput {
  code: string;
  title: string;
  kind: HomeChannelKind;
  sortStrategy: HomeSortStrategy;
  categoryFilter: string | null;
  collectionId: string | null;
  collectionSlug: string | null;
  order: number;
  itemLimit: number;
  fillFromDb: boolean;
  enabled: boolean;
  items: VideoDTO[];
}

/** 首页质量门槛：禁止无封面、裂图、无简介、无评分、无可用源的视频出现 */
const HIGH_QUALITY_FILTER: Prisma.VideoWhereInput = {
  cover: { not: "" },
  coverStatus: { not: CoverStatus.INVALID },
  description: { not: "" },
  score: { gt: 0 },
  sources: { some: { isActive: true } },
};

/** SCORE 频道默认最低门槛 */
const SCORE_CHANNEL_MIN = 8.0;

/** 即将上映的 remarks 关键词 */
const UPCOMING_KEYWORDS = ["即将上映", "即将", "待播", "预告", "未播"];

const DEFAULT_CHANNELS: Array<{
  code: string;
  title: string;
  kind: HomeChannelKind;
  sortStrategy: HomeSortStrategy;
  categoryFilter: string | null;
  order: number;
  itemLimit: number;
}> = [
  { code: "banner",       title: "Banner 轮播",   kind: HomeChannelKind.BANNER, sortStrategy: HomeSortStrategy.SCORE,      categoryFilter: null,      order: 0,   itemLimit: 5 },
  { code: "today",        title: "今日推荐",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.LATEST,     categoryFilter: null,      order: 10,  itemLimit: 12 },
  { code: "hot_now",      title: "热播榜",         kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.PLAY_COUNT, categoryFilter: null,      order: 15,  itemLimit: 10 },
  { code: "recent_update",title: "最近更新",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.LATEST,     categoryFilter: null,      order: 18,  itemLimit: 12 },
  { code: "score_top",    title: "高分影片",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.SCORE,      categoryFilter: null,      order: 22,  itemLimit: 10 },
  { code: "upcoming",     title: "即将上映",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.UPCOMING,   categoryFilter: null,      order: 25,  itemLimit: 8 },
  { code: "hot_movie",    title: "热门电影",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.LATEST,     categoryFilter: "movie",   order: 30,  itemLimit: 12 },
  { code: "hot_tv",       title: "热门剧集",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.LATEST,     categoryFilter: "tv",      order: 40,  itemLimit: 12 },
  { code: "hot_anime",    title: "热门动漫",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.LATEST,     categoryFilter: "anime",   order: 50,  itemLimit: 12 },
  { code: "hot_variety",  title: "热门综艺",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.LATEST,     categoryFilter: "variety", order: 60,  itemLimit: 12 },
  { code: "hot_short",    title: "热门短剧",       kind: HomeChannelKind.CUSTOM, sortStrategy: HomeSortStrategy.LATEST,     categoryFilter: "short",   order: 70,  itemLimit: 12 },
];

@Injectable()
export class HomeConfigService {
  private readonly logger = new Logger(HomeConfigService.name);

  /** backfill 候选放大倍数：取 limit * X，再做曝光轮换 sort 截前 limit */
  private readonly ROTATION_OVERSAMPLE = 2;

  constructor(private readonly prisma: PrismaService) {}

  async ensureSeeded(): Promise<void> {
    for (const c of DEFAULT_CHANNELS) {
      await this.prisma.homeChannel.upsert({
        where: { code: c.code },
        create: c,
        update: {},
      });
    }
  }

  async getPublic(): Promise<{ channels: ChannelOutput[] }> {
    await this.ensureSeeded();
    const channels = await this.prisma.homeChannel.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
      include: { items: { orderBy: { order: "asc" } }, collection: true },
    });
    const filled = await Promise.all(channels.map((c) => this.fillChannel(c)));
    // 异步记录曝光（不阻塞首页响应）
    void this.recordImpressions(filled).catch((e) => {
      this.logger.warn(`impression log failed: ${e instanceof Error ? e.message : e}`);
    });
    return { channels: filled };
  }

  /**
   * 批量 upsert 当前首页展示的 (videoId, channelCode) 曝光计数
   * Fire-and-forget：不阻塞首页 SSR
   */
  private async recordImpressions(channels: ChannelOutput[]): Promise<void> {
    const now = new Date();
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const c of channels) {
      for (const v of c.items) {
        ops.push(
          this.prisma.homeImpression.upsert({
            where: { videoId_channelCode: { videoId: v.id, channelCode: c.code } },
            create: { videoId: v.id, channelCode: c.code, showCount: 1, lastShownAt: now },
            update: { showCount: { increment: 1 }, lastShownAt: now },
          }),
        );
      }
    }
    if (ops.length === 0) return;
    await this.prisma.$transaction(ops);
  }

  async listForAdmin() {
    await this.ensureSeeded();
    const channels = await this.prisma.homeChannel.findMany({
      orderBy: { order: "asc" },
      include: {
        items: { orderBy: { order: "asc" } },
        collection: { select: { id: true, slug: true, title: true } },
      },
    });
    const allVideoIds = channels.flatMap((c) => c.items.map((it) => it.videoId));
    const videos = await this.prisma.video.findMany({
      where: { id: { in: [...new Set(allVideoIds)] } },
      select: { id: true, title: true, cover: true, category: true, year: true, status: true },
    });
    const vById = new Map(videos.map((v) => [v.id, v]));

    return channels.map((c) => ({
      code: c.code,
      title: c.title,
      kind: c.kind,
      sortStrategy: c.sortStrategy,
      categoryFilter: c.categoryFilter,
      collectionId: c.collectionId,
      collectionSlug: c.collection?.slug ?? null,
      collectionTitle: c.collection?.title ?? null,
      order: c.order,
      itemLimit: c.itemLimit,
      fillFromDb: c.fillFromDb,
      enabled: c.enabled,
      minScore: c.minScore,
      minPlayCount: c.minPlayCount,
      items: c.items.map((it) => ({
        id: it.id,
        videoId: it.videoId,
        order: it.order,
        video: vById.get(it.videoId) ?? null,
      })),
    }));
  }

  async updateChannel(
    code: string,
    data: Partial<{
      title: string;
      categoryFilter: string | null;
      sortStrategy: HomeSortStrategy;
      kind: HomeChannelKind;
      collectionId: string | null;
      order: number;
      itemLimit: number;
      fillFromDb: boolean;
      enabled: boolean;
      minScore: number | null;
      minPlayCount: number | null;
    }>,
  ) {
    const c = await this.prisma.homeChannel.findUnique({ where: { code } });
    if (!c) throw new NotFoundException(`channel ${code} not found`);
    const upd: Prisma.HomeChannelUpdateInput = {};
    if (data.title !== undefined) upd.title = data.title;
    if (data.categoryFilter !== undefined) upd.categoryFilter = data.categoryFilter;
    if (data.sortStrategy !== undefined) upd.sortStrategy = data.sortStrategy;
    if (data.kind !== undefined) upd.kind = data.kind;
    if (data.collectionId !== undefined) {
      upd.collection = data.collectionId
        ? { connect: { id: data.collectionId } }
        : { disconnect: true };
    }
    if (data.order !== undefined) upd.order = data.order;
    if (data.itemLimit !== undefined) upd.itemLimit = data.itemLimit;
    if (data.fillFromDb !== undefined) upd.fillFromDb = data.fillFromDb;
    if (data.enabled !== undefined) upd.enabled = data.enabled;
    if (data.minScore !== undefined) upd.minScore = data.minScore;
    if (data.minPlayCount !== undefined) upd.minPlayCount = data.minPlayCount;
    await this.prisma.homeChannel.update({ where: { code }, data: upd });
    return { ok: true };
  }

  async addItem(code: string, videoId: string) {
    const c = await this.prisma.homeChannel.findUnique({ where: { code }, include: { items: true } });
    if (!c) throw new NotFoundException(`channel ${code} not found`);
    const v = await this.prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!v) throw new BadRequestException("video not found");
    const maxOrder = c.items.reduce((m, x) => Math.max(m, x.order), 0);
    await this.prisma.homeChannelItem.upsert({
      where: { channelId_videoId: { channelId: c.id, videoId } },
      create: { channelId: c.id, videoId, order: maxOrder + 10 },
      update: {},
    });
    return { ok: true };
  }

  async removeItem(code: string, videoId: string) {
    const c = await this.prisma.homeChannel.findUnique({ where: { code } });
    if (!c) throw new NotFoundException(`channel ${code} not found`);
    await this.prisma.homeChannelItem.deleteMany({ where: { channelId: c.id, videoId } });
    return { ok: true };
  }

  async reorderItems(code: string, orderedVideoIds: string[]) {
    const c = await this.prisma.homeChannel.findUnique({ where: { code } });
    if (!c) throw new NotFoundException(`channel ${code} not found`);
    await this.prisma.$transaction(
      orderedVideoIds.map((vid, idx) =>
        this.prisma.homeChannelItem.updateMany({
          where: { channelId: c.id, videoId: vid },
          data: { order: (idx + 1) * 10 },
        }),
      ),
    );
    return { ok: true };
  }

  async reorderChannels(orderedCodes: string[]) {
    await this.prisma.$transaction(
      orderedCodes.map((code, idx) =>
        this.prisma.homeChannel.update({ where: { code }, data: { order: (idx + 1) * 10 } }),
      ),
    );
    return { ok: true };
  }

  async createChannel(data: { code: string; title: string; kind?: HomeChannelKind; collectionId?: string; sortStrategy?: HomeSortStrategy; categoryFilter?: string | null; itemLimit?: number }) {
    if (!data.code || !data.title) throw new BadRequestException("code and title required");
    const existing = await this.prisma.homeChannel.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException("code already exists");
    const maxOrder = await this.prisma.homeChannel.aggregate({ _max: { order: true } });
    await this.prisma.homeChannel.create({
      data: {
        code: data.code,
        title: data.title,
        kind: data.kind ?? HomeChannelKind.CUSTOM,
        sortStrategy: data.sortStrategy ?? HomeSortStrategy.LATEST,
        categoryFilter: data.categoryFilter,
        collectionId: data.collectionId,
        order: (maxOrder._max.order ?? 0) + 10,
        itemLimit: data.itemLimit ?? 12,
        fillFromDb: true,
        enabled: true,
      },
    });
    return { ok: true };
  }

  async deleteChannel(code: string) {
    if (DEFAULT_CHANNELS.some((d) => d.code === code)) {
      throw new BadRequestException("default channel cannot be deleted; disable instead");
    }
    await this.prisma.homeChannel.delete({ where: { code } });
    return { ok: true };
  }

  // ---------- 内部：填充频道视频 ----------

  private async fillChannel(c: {
    code: string;
    title: string;
    kind: HomeChannelKind;
    sortStrategy: HomeSortStrategy;
    categoryFilter: string | null;
    collectionId: string | null;
    collection?: { id: string; slug: string; title: string } | null;
    order: number;
    itemLimit: number;
    fillFromDb: boolean;
    enabled: boolean;
    minScore?: number | null;
    minPlayCount?: number | null;
    items: Array<{ videoId: string; order: number }>;
  }): Promise<ChannelOutput> {
    const limit = Math.max(1, c.itemLimit);

    // COLLECTION 频道：直接读 collection_items
    if (c.kind === HomeChannelKind.COLLECTION && c.collectionId) {
      const coll = await this.prisma.collection.findUnique({
        where: { id: c.collectionId },
        include: { items: { orderBy: { order: "asc" }, take: limit } },
      });
      const ids = coll?.items.map((it) => it.videoId) ?? [];
      const videos =
        ids.length === 0
          ? []
          : await this.prisma.video.findMany({
              where: { id: { in: ids }, status: VideoStatus.PUBLISHED },
              include: FULL_VIDEO_INCLUDE,
            });
      const map = new Map(videos.map((v) => [v.id, v]));
      const ordered = ids.map((id) => map.get(id)).filter((v): v is NonNullable<typeof v> => !!v);
      return this.outputOf(c, ordered.map(toDTO));
    }

    // 1) 手动钉选
    const pinnedIds = c.items.map((it) => it.videoId);
    const pinned = pinnedIds.length === 0
      ? []
      : await this.prisma.video.findMany({
          where: { id: { in: pinnedIds }, status: VideoStatus.PUBLISHED },
          include: FULL_VIDEO_INCLUDE,
        });
    const pinnedMap = new Map(pinned.map((v) => [v.id, v]));
    const ordered = pinnedIds.map((id) => pinnedMap.get(id)).filter((v): v is NonNullable<typeof v> => !!v);

    // 2) fillFromDb 补齐（应用质量过滤 + 策略特定 where/order）
    if (c.fillFromDb && c.sortStrategy !== HomeSortStrategy.MANUAL && ordered.length < limit) {
      const need = limit - ordered.length;
      const exclude = ordered.map((v) => v.id);
      const where: Prisma.VideoWhereInput = {
        ...HIGH_QUALITY_FILTER,
        status: VideoStatus.PUBLISHED,
        id: { notIn: exclude },
      };
      if (c.categoryFilter) where.category = c.categoryFilter as Category;
      // 频道粒度阈值（P6.2）
      if (typeof c.minScore === "number" && c.minScore > 0) where.score = { gte: c.minScore };
      if (typeof c.minPlayCount === "number" && c.minPlayCount > 0) where.playCount = { gte: c.minPlayCount };

      let orderBy: Prisma.VideoOrderByWithRelationInput[];
      switch (c.sortStrategy) {
        case HomeSortStrategy.SCORE:
          where.score = { gte: SCORE_CHANNEL_MIN };
          orderBy = [{ score: "desc" }, { playCount: "desc" }, { sourceUpdatedAt: "desc" }];
          break;
        case HomeSortStrategy.PLAY_COUNT:
          orderBy = [{ playCount: "desc" }, { score: "desc" }, { sourceUpdatedAt: "desc" }];
          break;
        case HomeSortStrategy.UPCOMING: {
          const nextYear = new Date().getFullYear() + 1;
          where.OR = [
            { year: { gte: nextYear } },
            ...UPCOMING_KEYWORDS.map((kw) => ({ remarks: { contains: kw } })),
          ];
          orderBy = [{ year: "desc" }, { sourceUpdatedAt: "desc" }];
          break;
        }
        case HomeSortStrategy.LATEST:
        default:
          // P1: 综合更新热度（sourceUpdatedAt + playCount + score）
          orderBy = [{ sourceUpdatedAt: "desc" }, { playCount: "desc" }, { score: "desc" }];
      }
      // 取 need * ROTATION_OVERSAMPLE 候选，再用曝光计数轮换
      const overSampled = await this.prisma.video.findMany({
        where,
        orderBy,
        take: need * this.ROTATION_OVERSAMPLE,
        include: FULL_VIDEO_INCLUDE,
      });
      const more = await this.rotateByImpression(overSampled, c.code, need);
      ordered.push(...more);

      // backfill 仍不足 → 放宽到通用热度兜底（不再受 categoryFilter 之外的策略 where 影响），但保留 quality filter
      if (ordered.length < limit) {
        const stillNeed = limit - ordered.length;
        const exclude2 = ordered.map((v) => v.id);
        const fallbackWhere: Prisma.VideoWhereInput = {
          ...HIGH_QUALITY_FILTER,
          status: VideoStatus.PUBLISHED,
          id: { notIn: exclude2 },
        };
        if (c.categoryFilter) fallbackWhere.category = c.categoryFilter as Category;
        const fallback = await this.prisma.video.findMany({
          where: fallbackWhere,
          orderBy: [{ playCount: "desc" }, { score: "desc" }, { sourceUpdatedAt: "desc" }],
          take: stillNeed,
          include: FULL_VIDEO_INCLUDE,
        });
        ordered.push(...fallback);
      }
    }

    return this.outputOf(c, ordered.slice(0, limit).map(toDTO));
  }

  /**
   * 在已按 sortStrategy 排好的候选池中插入"曝光惩罚"：
   *   - 查询 HomeImpression 拿到 (videoId, showCount)
   *   - 按 (showCount asc, originalIndex asc) stable sort —— 同等曝光内保留原热度顺序
   *   - 截前 N
   * 当 video 没出现过曝光记录时 showCount=0，最优先
   */
  private async rotateByImpression<T extends { id: string }>(
    candidates: T[],
    channelCode: string,
    n: number,
  ): Promise<T[]> {
    if (candidates.length <= n) return candidates;
    const ids = candidates.map((v) => v.id);
    const impressions = await this.prisma.homeImpression.findMany({
      where: { videoId: { in: ids }, channelCode },
      select: { videoId: true, showCount: true },
    });
    const counts = new Map(impressions.map((i) => [i.videoId, i.showCount]));
    const ranked = candidates
      .map((v, idx) => ({ v, idx, showCount: counts.get(v.id) ?? 0 }))
      .sort((a, b) => (a.showCount === b.showCount ? a.idx - b.idx : a.showCount - b.showCount));
    return ranked.slice(0, n).map((x) => x.v);
  }

  private outputOf(
    c: { code: string; title: string; kind: HomeChannelKind; sortStrategy: HomeSortStrategy; categoryFilter: string | null; collectionId: string | null; collection?: { slug: string } | null; order: number; itemLimit: number; fillFromDb: boolean; enabled: boolean },
    items: VideoDTO[],
  ): ChannelOutput {
    return {
      code: c.code,
      title: c.title,
      kind: c.kind,
      sortStrategy: c.sortStrategy,
      categoryFilter: c.categoryFilter,
      collectionId: c.collectionId,
      collectionSlug: c.collection?.slug ?? null,
      order: c.order,
      itemLimit: c.itemLimit,
      fillFromDb: c.fillFromDb,
      enabled: c.enabled,
      items,
    };
  }
}
