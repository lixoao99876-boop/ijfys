import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Category, HomeChannelKind, HomeSortStrategy, Prisma, VideoStatus } from "@prisma/client";
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
    return { channels: filled };
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

    // 2) fillFromDb 补齐
    if (c.fillFromDb && c.sortStrategy !== HomeSortStrategy.MANUAL && ordered.length < limit) {
      const need = limit - ordered.length;
      const exclude = ordered.map((v) => v.id);
      const where: Prisma.VideoWhereInput = {
        status: VideoStatus.PUBLISHED,
        id: { notIn: exclude },
      };
      if (c.categoryFilter) where.category = c.categoryFilter as Category;

      let orderBy: Prisma.VideoOrderByWithRelationInput[];
      switch (c.sortStrategy) {
        case HomeSortStrategy.SCORE:
          orderBy = [{ score: "desc" }, { sourceUpdatedAt: "desc" }];
          break;
        case HomeSortStrategy.PLAY_COUNT:
          orderBy = [{ playCount: "desc" }, { score: "desc" }];
          break;
        case HomeSortStrategy.UPCOMING:
          orderBy = [{ year: "desc" }, { sourceUpdatedAt: "desc" }];
          where.year = { gte: new Date().getFullYear() };
          break;
        case HomeSortStrategy.LATEST:
        default:
          orderBy = [{ sourceUpdatedAt: "desc" }, { score: "desc" }];
      }
      const more = await this.prisma.video.findMany({
        where,
        orderBy,
        take: need,
        include: FULL_VIDEO_INCLUDE,
      });
      ordered.push(...more);
    }

    return this.outputOf(c, ordered.slice(0, limit).map(toDTO));
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
