import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 线路评分（满分 100，越高越好）
 *
 * 元数据维度（抓取时已知）：
 *  - 可播放性 isActive=true && failureCount<3 : +30
 *  - 多线路覆盖：本 source 集数 / video.maxEpisodes : +0~20
 *  - 画质：1080P/原画+20 / 4K+22 / 720P+12 / 其他+5
 *  - 更新速度：相对 video.sourceUpdatedAt 越新加分，最多 +10
 *
 * 播放反馈维度（前端 telemetry 上报）：
 *  - successRate = success / (success + fail)
 *    · 样本 < 3：保持中性 +5
 *    · 样本 >= 3：rate ≥ 0.95 → +15；0.8 → +10；0.5 → +5；< 0.5 → 0
 *  - avgResponseTimeMs：响应越快加分，最多 +8
 *    · < 800ms → +8 / < 2000ms → +5 / < 5000ms → +2 / 否则 0
 *
 * 失败惩罚：min(25, failureCount * 5)
 * provider.weight 作为基底比例（默认 100 → ×1）
 */
@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async scoreAll(): Promise<{ updated: number }> {
    const videos = await this.prisma.video.findMany({ select: { id: true } });
    let updated = 0;
    for (const v of videos) {
      updated += await this.scoreVideo(v.id);
    }
    this.logger.log(`评分完成：${updated} 条 source 更新`);
    return { updated };
  }

  /** 单视频评分，返回更新的 source 行数 */
  async scoreVideo(videoId: string): Promise<number> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        sources: { include: { provider: true } },
        episodes: { select: { id: true } },
      },
    });
    if (!video) return 0;
    const maxEpisodes = Math.max(1, video.episodes.length);

    let count = 0;
    for (const s of video.sources) {
      const playable = s.isActive && s.failureCount < 3 ? 30 : 0;
      const coverage = Math.min(20, Math.round((s.totalEpisodes / maxEpisodes) * 20));
      const quality = this.qualityScore(s.quality);
      const recency = this.recencyScore(s.lastSucceededAt ?? s.updatedAt, video.sourceUpdatedAt);
      const successScore = this.successRateScore(s.playSuccessCount, s.playFailCount);
      const responseScore = this.responseTimeScore(s.avgResponseTimeMs);
      const failurePenalty = Math.min(25, s.failureCount * 5);

      const base =
        playable + coverage + quality + recency + successScore + responseScore - failurePenalty;
      const weighted = Math.round(base * (s.provider.weight / 100));
      const final = Math.max(0, Math.min(100, weighted));

      await this.prisma.source.update({ where: { id: s.id }, data: { score: final } });
      count++;
    }
    return count;
  }

  private qualityScore(q: string): number {
    const map: Record<string, number> = { "4K": 22, "1080P": 20, "原画": 15, "720P": 12, "480P": 5, "未知": 5 };
    return map[q] ?? 5;
  }

  private recencyScore(sourceFresh: Date | null, videoFresh: Date | null): number {
    if (!sourceFresh) return 0;
    const anchor = videoFresh?.getTime() ?? Date.now();
    const ageDays = Math.max(0, (anchor - sourceFresh.getTime()) / 86400000);
    if (ageDays <= 1) return 10;
    if (ageDays <= 3) return 7;
    if (ageDays <= 7) return 4;
    if (ageDays <= 30) return 2;
    return 0;
  }

  /** 播放成功率评分（样本 < 3 时给中性分） */
  private successRateScore(success: number, fail: number): number {
    const total = success + fail;
    if (total < 3) return 5;
    const rate = success / total;
    if (rate >= 0.95) return 15;
    if (rate >= 0.8) return 10;
    if (rate >= 0.5) return 5;
    return 0;
  }

  /** 平均响应时间评分（毫秒），越快越高 */
  private responseTimeScore(ms: number | null): number {
    if (ms === null || ms === undefined) return 0;
    if (ms < 800) return 8;
    if (ms < 2000) return 5;
    if (ms < 5000) return 2;
    return 0;
  }

  /** 取这部视频的最佳线路（score 最高且仍 active） */
  async pickBestSource(videoId: string) {
    return this.prisma.source.findFirst({
      where: { videoId, isActive: true },
      orderBy: [{ score: "desc" }, { totalEpisodes: "desc" }, { updatedAt: "desc" }],
      include: { provider: true },
    });
  }

  /**
   * 前端上报线路播放失败。
   *  - failureCount + playFailCount 同时累计
   *  - 落地后重算本视频所有 source 的 score（含其他被对比的线路）
   */
  async reportFailure(sourceId: string): Promise<void> {
    await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        failureCount: { increment: 1 },
        playFailCount: { increment: 1 },
        lastFailedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    });
    await this.recomputeOne(sourceId);
  }

  /**
   * 前端上报线路播放成功。
   *  - playSuccessCount + 1；failureCount 清零（恢复信任）
   *  - 若带 responseTimeMs，按滑动平均更新 avgResponseTimeMs
   *  - 若带 playDurationMs，累计到 totalPlayMs
   */
  async reportSuccess(
    sourceId: string,
    responseTimeMs?: number,
    playDurationMs?: number,
  ): Promise<void> {
    const src = await this.prisma.source.findUnique({
      where: { id: sourceId },
      select: { playSuccessCount: true, avgResponseTimeMs: true, videoId: true },
    });
    if (!src) return;

    let nextAvg = src.avgResponseTimeMs;
    if (typeof responseTimeMs === "number" && responseTimeMs >= 0 && responseTimeMs < 60_000) {
      const N = src.playSuccessCount;
      const w = 1 / Math.max(20, N + 1);
      nextAvg =
        src.avgResponseTimeMs === null
          ? Math.round(responseTimeMs)
          : Math.round(src.avgResponseTimeMs * (1 - w) + responseTimeMs * w);
    }

    const playMs =
      typeof playDurationMs === "number" && playDurationMs > 0 && playDurationMs < 12 * 3600 * 1000
        ? Math.round(playDurationMs)
        : 0;

    await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        failureCount: 0,
        playSuccessCount: { increment: 1 },
        avgResponseTimeMs: nextAvg,
        totalPlayMs: playMs > 0 ? { increment: playMs } : undefined,
        lastSucceededAt: new Date(),
        lastCheckedAt: new Date(),
      },
    });
    // 视频维度的 playCount + 1（成功播放计一次浏览）
    await this.prisma.video.update({
      where: { id: src.videoId },
      data: { playCount: { increment: 1 } },
    });
    await this.recomputeOne(sourceId);
  }

  private async recomputeOne(sourceId: string): Promise<void> {
    const s = await this.prisma.source.findUnique({ where: { id: sourceId } });
    if (s) await this.scoreVideo(s.videoId);
  }
}
