import { Injectable } from "@nestjs/common";
import { Category, Prisma, VideoStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FULL_VIDEO_INCLUDE, toDTO, type VideoDTO } from "../api/video.mapper";

/**
 * 推荐引擎
 *
 * 综合分公式：playCount*0.6 + score*5*0.3 + recency_days_inv*0.1
 *   (recency 项把"30 天内"换算成 0-100 的分；score 乘 5 拉到 0-50 量级；playCount 量级最大)
 * 由于 Prisma 不能直接算复合 order，统一用"先按 playCount + score + sourceUpdatedAt 复合 orderBy"近似。
 */
@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  /** 综合热门推荐 */
  async popular(opts: { category?: Category; limit?: number; excludeId?: string } = {}): Promise<VideoDTO[]> {
    const limit = Math.min(60, Math.max(1, opts.limit ?? 12));
    const where: Prisma.VideoWhereInput = {
      status: VideoStatus.PUBLISHED,
    };
    if (opts.category) where.category = opts.category;
    if (opts.excludeId) where.id = { not: opts.excludeId };

    const rows = await this.prisma.video.findMany({
      where,
      orderBy: [{ playCount: "desc" }, { score: "desc" }, { sourceUpdatedAt: "desc" }],
      take: limit,
      include: FULL_VIDEO_INCLUDE,
    });
    return rows.map(toDTO);
  }

  /** 视频维度推荐：同演员/同导演/同类型/猜你喜欢 */
  async forVideo(videoId: string): Promise<{
    byActor: VideoDTO[];
    byDirector: VideoDTO[];
    byGenre: VideoDTO[];
    similar: VideoDTO[];
  }> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, category: true, year: true, region: true, actors: true, director: true, genres: true },
    });
    if (!video) return { byActor: [], byDirector: [], byGenre: [], similar: [] };

    const exclude = { id: { not: videoId }, status: VideoStatus.PUBLISHED } as const;

    const [actorRows, directorRows, genreRows, similarRows] = await Promise.all([
      // 同演员
      video.actors.length > 0
        ? this.prisma.video.findMany({
            where: { ...exclude, actors: { hasSome: video.actors.slice(0, 5) } },
            orderBy: [{ playCount: "desc" }, { score: "desc" }],
            take: 10,
            include: FULL_VIDEO_INCLUDE,
          })
        : Promise.resolve([]),
      // 同导演
      video.director
        ? this.prisma.video.findMany({
            where: { ...exclude, director: video.director },
            orderBy: [{ playCount: "desc" }, { score: "desc" }],
            take: 10,
            include: FULL_VIDEO_INCLUDE,
          })
        : Promise.resolve([]),
      // 同类型（genres 交集）
      video.genres.length > 0
        ? this.prisma.video.findMany({
            where: { ...exclude, genres: { hasSome: video.genres.slice(0, 5) }, category: video.category },
            orderBy: [{ playCount: "desc" }, { score: "desc" }],
            take: 10,
            include: FULL_VIDEO_INCLUDE,
          })
        : Promise.resolve([]),
      // 猜你喜欢（同分类 + 近年 + 高分）
      this.prisma.video.findMany({
        where: {
          ...exclude,
          category: video.category,
          ...(video.year ? { year: { gte: video.year - 3, lte: video.year + 3 } } : {}),
        },
        orderBy: [{ score: "desc" }, { playCount: "desc" }, { sourceUpdatedAt: "desc" }],
        take: 12,
        include: FULL_VIDEO_INCLUDE,
      }),
    ]);

    return {
      byActor: actorRows.map(toDTO),
      byDirector: directorRows.map(toDTO),
      byGenre: genreRows.map(toDTO),
      similar: similarRows.map(toDTO),
    };
  }

  /** 本周热门（近 7 天 source.lastSucceededAt 的视频按 playCount 排序） */
  async weeklyHot(limit = 12): Promise<VideoDTO[]> {
    const lm = Math.min(60, Math.max(1, limit));
    const since = new Date(Date.now() - 7 * 86400_000);
    const rows = await this.prisma.video.findMany({
      where: {
        status: VideoStatus.PUBLISHED,
        playCount: { gt: 0 },
        sources: { some: { lastSucceededAt: { gte: since } } },
      },
      orderBy: [{ playCount: "desc" }, { score: "desc" }],
      take: lm,
      include: FULL_VIDEO_INCLUDE,
    });
    // 兜底：如果近 7 天无成功播放，退化为全期 playCount Top
    if (rows.length === 0) {
      const fallback = await this.prisma.video.findMany({
        where: { status: VideoStatus.PUBLISHED, playCount: { gt: 0 } },
        orderBy: [{ playCount: "desc" }, { score: "desc" }],
        take: lm,
        include: FULL_VIDEO_INCLUDE,
      });
      return fallback.map(toDTO);
    }
    return rows.map(toDTO);
  }

  /** 同类型热门（按 category 分组 Top） */
  async hotByCategory(category: Category, limit = 12): Promise<VideoDTO[]> {
    const lm = Math.min(60, Math.max(1, limit));
    const rows = await this.prisma.video.findMany({
      where: { status: VideoStatus.PUBLISHED, category },
      orderBy: [{ playCount: "desc" }, { score: "desc" }, { sourceUpdatedAt: "desc" }],
      take: lm,
      include: FULL_VIDEO_INCLUDE,
    });
    return rows.map(toDTO);
  }

  /**
   * 看过 X 的用户还看了 Y（基于 UserHistory 协同过滤）
   * 数据稀少时降级到 byGenre + byActor 组合
   */
  async usersAlsoWatched(videoId: string, limit = 12): Promise<VideoDTO[]> {
    const lm = Math.min(30, Math.max(1, limit));
    // 找看过此视频的用户
    const watchedUsers = await this.prisma.userHistory.findMany({
      where: { videoId },
      select: { userId: true },
      take: 200,
    });
    if (watchedUsers.length >= 3) {
      const userIds = watchedUsers.map((u) => u.userId);
      const co = await this.prisma.userHistory.groupBy({
        by: ["videoId"],
        where: { userId: { in: userIds }, videoId: { not: videoId } },
        _count: { videoId: true },
        orderBy: { _count: { videoId: "desc" } },
        take: lm,
      });
      const ids = co.map((c) => c.videoId);
      if (ids.length > 0) {
        const videos = await this.prisma.video.findMany({
          where: { id: { in: ids }, status: VideoStatus.PUBLISHED },
          include: FULL_VIDEO_INCLUDE,
        });
        const map = new Map(videos.map((v) => [v.id, v]));
        const ordered = ids.map((id) => map.get(id)).filter((v): v is NonNullable<typeof v> => !!v);
        if (ordered.length >= 3) return ordered.map(toDTO);
      }
    }
    // 冷启动降级：直接复用 forVideo 的 byGenre/similar 合并
    const rec = await this.forVideo(videoId);
    const seen = new Set<string>();
    const merged: VideoDTO[] = [];
    for (const v of [...rec.byGenre, ...rec.similar]) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      merged.push(v);
      if (merged.length >= lm) break;
    }
    return merged;
  }

  /** 热门演员的作品（用法：actor 详情页 → 取其作品 + 同年代同类型扩展推荐） */
  async popularActorWorks(actorName: string, limit = 12): Promise<VideoDTO[]> {
    return this.forActor(actorName, { limit });
  }

  /** 同演员作品（暴露给 actor 页/推荐组件） */
  async forActor(actorName: string, opts: { excludeVideoId?: string; limit?: number } = {}): Promise<VideoDTO[]> {
    const limit = Math.min(30, Math.max(1, opts.limit ?? 12));
    const where: Prisma.VideoWhereInput = {
      status: VideoStatus.PUBLISHED,
      actors: { has: actorName },
    };
    if (opts.excludeVideoId) where.id = { not: opts.excludeVideoId };
    const rows = await this.prisma.video.findMany({
      where,
      orderBy: [{ playCount: "desc" }, { score: "desc" }],
      take: limit,
      include: FULL_VIDEO_INCLUDE,
    });
    return rows.map(toDTO);
  }
}
