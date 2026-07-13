import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { CoverStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 封面质量检测
 *
 * 痛点：资源站给的 cover 偶有 404 / 域名挂掉，前端展示成"裂图"。
 *
 * 策略：
 *  - 每天 04:00 抽样检测最久未检测的 N 个视频（默认 500）
 *  - HEAD 请求 cover URL，5 秒超时
 *  - 200/204/206/304 → VALID
 *  - 4xx/5xx/超时/DNS 失败 → INVALID
 *  - 其它（连接重置等可重试）→ 保持原状态
 *  - 标记 INVALID 的视频会被首页 quality filter 直接剔除
 *
 * 手动触发：调用 checkBatch(n) 单次扫描 N 条
 */
@Injectable()
export class CoverQualityService {
  private readonly logger = new Logger(CoverQualityService.name);

  /** 单次扫描上限，避免堵塞 */
  private readonly BATCH_SIZE = Number(process.env.COVER_CHECK_BATCH ?? 500);
  /** HEAD 请求超时 (ms) */
  private readonly TIMEOUT_MS = Number(process.env.COVER_CHECK_TIMEOUT_MS ?? 5000);
  /** 并发数 */
  private readonly CONCURRENCY = Number(process.env.COVER_CHECK_CONCURRENCY ?? 16);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(process.env.COVER_CHECK_CRON ?? "0 4 * * *", { timeZone: "Asia/Shanghai" })
  async runDaily(): Promise<void> {
    if (process.env.COVER_CHECK_ENABLED === "false") {
      this.logger.log("cover-quality cron disabled by env");
      return;
    }
    const result = await this.checkBatch(this.BATCH_SIZE);
    this.logger.log(`daily cover-check done ${JSON.stringify(result)}`);
  }

  async checkBatch(limit: number): Promise<{ scanned: number; valid: number; invalid: number; skipped: number }> {
    // 选最久未检测的视频；UNKNOWN 优先，再按 coverCheckedAt asc nulls first
    const rows = await this.prisma.video.findMany({
      where: { cover: { not: null }, NOT: { cover: "" } },
      select: { id: true, cover: true },
      orderBy: [{ coverCheckedAt: { sort: "asc", nulls: "first" } }],
      take: limit,
    });

    let valid = 0;
    let invalid = 0;
    let skipped = 0;

    // 并发处理（简单分批，固定并发数）
    const queue = [...rows];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.CONCURRENCY; i++) {
      workers.push(
        (async () => {
          while (queue.length) {
            const item = queue.shift();
            if (!item || !item.cover) continue;
            const verdict = await this.probe(item.cover);
            if (verdict === "VALID") valid++;
            else if (verdict === "INVALID") invalid++;
            else {
              skipped++;
              // 不更新 coverCheckedAt，下次再试
              continue;
            }
            await this.prisma.video.update({
              where: { id: item.id },
              data: {
                coverStatus: verdict as CoverStatus,
                coverCheckedAt: new Date(),
              },
            });
          }
        })(),
      );
    }
    await Promise.all(workers);

    return { scanned: rows.length, valid, invalid, skipped };
  }

  /** 探测单个 URL，返回 VALID / INVALID / null(不确定) */
  private async probe(url: string): Promise<"VALID" | "INVALID" | null> {
    if (!/^https?:\/\//i.test(url)) return "INVALID";
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), this.TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: ctl.signal,
        // 某些 CDN 拒绝无 UA 的请求
        headers: { "User-Agent": "Mozilla/5.0 ijfys-cover-check/1.0" },
      });
      // 部分 CDN 不支持 HEAD，会返 405 — 此时降级为 GET range 1 字节
      if (res.status === 405) {
        return this.probeGet(url);
      }
      if (res.status >= 200 && res.status < 400) return "VALID";
      if (res.status >= 400 && res.status < 600) return "INVALID";
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // 超时 / DNS / TLS 错 — 算 INVALID（一次性，下次扫描会重试）
      if (msg.includes("abort") || msg.includes("timeout") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED")) {
        return "INVALID";
      }
      // 其它瞬时错误 — 不确定
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  private async probeGet(url: string): Promise<"VALID" | "INVALID" | null> {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), this.TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctl.signal,
        headers: { "User-Agent": "Mozilla/5.0 ijfys-cover-check/1.0", Range: "bytes=0-1" },
      });
      if (res.status >= 200 && res.status < 400) return "VALID";
      if (res.status >= 400 && res.status < 600) return "INVALID";
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
}
