import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { VideoStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- 收藏 ----------
  async favorites(userId: string, page = 1, limit = 24) {
    const pg = Math.max(1, page);
    const lm = Math.min(60, Math.max(1, limit));
    const [rows, total] = await Promise.all([
      this.prisma.userFavorite.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (pg - 1) * lm,
        take: lm,
      }),
      this.prisma.userFavorite.count({ where: { userId } }),
    ]);
    const videoIds = rows.map((r) => r.videoId);
    const videos =
      videoIds.length === 0
        ? []
        : await this.prisma.video.findMany({
            where: { id: { in: videoIds }, status: VideoStatus.PUBLISHED },
            select: { id: true, title: true, cover: true, category: true, year: true, region: true, remarks: true, score: true },
          });
    const byId = new Map(videos.map((v) => [v.id, v]));
    return {
      items: rows.map((r) => ({
        videoId: r.videoId,
        createdAt: r.createdAt,
        video: byId.get(r.videoId) ?? null,
      })),
      page: pg,
      limit: lm,
      total,
    };
  }

  async addFavorite(userId: string, videoId: string) {
    const v = await this.prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!v) throw new BadRequestException("video not found");
    await this.prisma.userFavorite.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: { userId, videoId },
      update: {},
    });
    return { ok: true };
  }

  async removeFavorite(userId: string, videoId: string) {
    await this.prisma.userFavorite.deleteMany({ where: { userId, videoId } });
    return { ok: true };
  }

  async isFavorite(userId: string, videoId: string) {
    const f = await this.prisma.userFavorite.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    return { favorited: !!f };
  }

  // ---------- 历史 ----------
  async histories(userId: string, page = 1, limit = 24) {
    const pg = Math.max(1, page);
    const lm = Math.min(60, Math.max(1, limit));
    const [rows, total] = await Promise.all([
      this.prisma.userHistory.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        skip: (pg - 1) * lm,
        take: lm,
      }),
      this.prisma.userHistory.count({ where: { userId } }),
    ]);
    const videoIds = rows.map((r) => r.videoId);
    const videos =
      videoIds.length === 0
        ? []
        : await this.prisma.video.findMany({
            where: { id: { in: videoIds } },
            select: { id: true, title: true, cover: true, category: true, year: true },
          });
    const byId = new Map(videos.map((v) => [v.id, v]));
    return {
      items: rows.map((r) => ({
        videoId: r.videoId,
        episodeId: r.episodeId,
        episodeName: r.episodeName,
        progress: r.progress,
        duration: r.duration,
        updatedAt: r.updatedAt,
        video: byId.get(r.videoId) ?? null,
      })),
      page: pg,
      limit: lm,
      total,
    };
  }

  async upsertHistory(
    userId: string,
    data: { videoId: string; episodeId?: string; episodeName?: string; progress: number; duration: number },
  ) {
    if (!data.videoId) throw new BadRequestException("videoId required");
    await this.prisma.userHistory.upsert({
      where: { userId_videoId: { userId, videoId: data.videoId } },
      create: {
        userId,
        videoId: data.videoId,
        episodeId: data.episodeId,
        episodeName: data.episodeName,
        progress: Math.max(0, Math.floor(data.progress ?? 0)),
        duration: Math.max(0, Math.floor(data.duration ?? 0)),
      },
      update: {
        episodeId: data.episodeId,
        episodeName: data.episodeName,
        progress: Math.max(0, Math.floor(data.progress ?? 0)),
        duration: Math.max(0, Math.floor(data.duration ?? 0)),
      },
    });
    return { ok: true };
  }

  async removeHistory(userId: string, videoId: string) {
    await this.prisma.userHistory.deleteMany({ where: { userId, videoId } });
    return { ok: true };
  }

  async clearHistory(userId: string) {
    await this.prisma.userHistory.deleteMany({ where: { userId } });
    return { ok: true };
  }

  /** 登录后从 localStorage 一次性合并到服务端 */
  async mergeHistories(
    userId: string,
    items: Array<{ videoId: string; episodeId?: string; episodeName?: string; progress: number; duration: number; updatedAt?: number }>,
  ) {
    let imported = 0;
    for (const it of items) {
      if (!it.videoId) continue;
      try {
        await this.upsertHistory(userId, it);
        imported++;
      } catch {
        // ignore single failure
      }
    }
    return { imported };
  }

  // ---------- 评分 ----------
  async myRating(userId: string, videoId: string) {
    const r = await this.prisma.userRating.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    return r ?? null;
  }

  async rate(userId: string, data: { videoId: string; rating: number; comment?: string }) {
    if (!data.videoId) throw new BadRequestException("videoId required");
    const r = Math.max(1, Math.min(10, Math.floor(data.rating)));
    await this.prisma.userRating.upsert({
      where: { userId_videoId: { userId, videoId: data.videoId } },
      create: { userId, videoId: data.videoId, rating: r, comment: data.comment },
      update: { rating: r, comment: data.comment },
    });
    return { ok: true };
  }

  async myRatings(userId: string) {
    const rows = await this.prisma.userRating.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const videoIds = rows.map((r) => r.videoId);
    const videos =
      videoIds.length === 0
        ? []
        : await this.prisma.video.findMany({
            where: { id: { in: videoIds } },
            select: { id: true, title: true, cover: true, category: true, year: true },
          });
    const byId = new Map(videos.map((v) => [v.id, v]));
    return rows.map((r) => ({
      videoId: r.videoId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      video: byId.get(r.videoId) ?? null,
    }));
  }

  /** 视频聚合评分（公开） */
  async videoRatingSummary(videoId: string) {
    const agg = await this.prisma.userRating.aggregate({
      where: { videoId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      avg: agg._avg.rating ?? null,
      count: agg._count.rating,
    };
  }
}
