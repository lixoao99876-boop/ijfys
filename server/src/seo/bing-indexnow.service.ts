import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/** IndexNow 官方接口偶发极慢，沿用 aiskill88 实测的 60s 超时 */
const TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SubmitResult {
  ok: boolean;
  status?: number;
  submitted: number;
  enqueued: number;
  error?: string;
}

@Injectable()
export class BingIndexnowService {
  private readonly logger = new Logger(BingIndexnowService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get siteUrl(): string {
    return (process.env.PUBLIC_SITE_URL ?? "https://aiskill88.xyz").replace(/\/+$/, "");
  }

  private get key(): string | undefined {
    return process.env.INDEXNOW_KEY || undefined;
  }

  get enabled(): boolean {
    return !!this.key;
  }

  /** 提交一批 URL；408 立即重试一次、5xx 等 5s 重试一次、429/仍失败 → 入重试队列 */
  async submitBatch(urls: string[]): Promise<SubmitResult> {
    if (!this.enabled) return { ok: false, submitted: 0, enqueued: 0, error: "INDEXNOW_KEY not set" };
    if (urls.length === 0) return { ok: true, submitted: 0, enqueued: 0 };

    const host = new URL(this.siteUrl).host;
    const body = JSON.stringify({
      host,
      key: this.key,
      keyLocation: `${this.siteUrl}/${this.key}.txt`,
      urlList: urls,
    });

    const post = async (): Promise<{ status: number } | { error: string }> => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(INDEXNOW_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body,
          signal: ctl.signal,
        });
        return { status: res.status };
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      } finally {
        clearTimeout(timer);
      }
    };

    let r = await post();
    if ("status" in r && r.status === 408) r = await post(); // 408 立即重试
    if ("status" in r && r.status >= 500) {
      await sleep(5000); // 5xx 延迟 5s 重试
      r = await post();
    }

    if ("status" in r && (r.status === 200 || r.status === 202)) {
      await this.markSubmitted(urls);
      this.logger.log(`IndexNow OK (${r.status}) × ${urls.length} urls`);
      return { ok: true, status: r.status, submitted: urls.length, enqueued: 0 };
    }

    const reason = "status" in r ? `HTTP ${r.status}` : r.error;
    await Promise.all(urls.map((u) => this.enqueueRetry(u, reason)));
    this.logger.warn(`IndexNow failed (${reason}), enqueued ${urls.length} urls`);
    return { ok: false, status: "status" in r ? r.status : undefined, submitted: 0, enqueued: urls.length, error: reason };
  }

  private async markSubmitted(urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.prisma.bingRetryQueue.upsert({
        where: { url },
        create: { url, status: "submitted", attempts: 1 },
        update: { status: "submitted", attempts: { increment: 1 }, lastError: null },
      });
    }
  }

  async enqueueRetry(url: string, reason: string): Promise<void> {
    await this.prisma.bingRetryQueue.upsert({
      where: { url },
      create: { url, status: "pending_retry", attempts: 0, lastError: reason },
      update: { status: "pending_retry", lastError: reason },
    });
  }

  /** 批量消化重试队列；attempts 超限 → failed */
  async drainQueue(opts: { batchSize?: number; gapMs?: number } = {}): Promise<{ drained: number; ok: number; failed: number }> {
    const { batchSize = 50, gapMs = 2000 } = opts;
    let drained = 0;
    let ok = 0;
    let failed = 0;

    for (;;) {
      const rows = await this.prisma.bingRetryQueue.findMany({
        where: { status: "pending_retry", attempts: { lt: MAX_ATTEMPTS } },
        take: batchSize,
        orderBy: { updatedAt: "asc" },
      });
      if (rows.length === 0) break;

      const urls = rows.map((r) => r.url);
      await this.prisma.bingRetryQueue.updateMany({
        where: { url: { in: urls } },
        data: { attempts: { increment: 1 } },
      });
      const res = await this.submitBatch(urls);
      drained += urls.length;
      if (res.ok) ok += urls.length;
      if (rows.length < batchSize) break;
      await sleep(gapMs);
    }

    const dead = await this.prisma.bingRetryQueue.updateMany({
      where: { status: "pending_retry", attempts: { gte: MAX_ATTEMPTS } },
      data: { status: "failed" },
    });
    failed = dead.count;
    return { drained, ok, failed };
  }

  async stats() {
    const grouped = await this.prisma.bingRetryQueue.groupBy({ by: ["status"], _count: true });
    const recent = await this.prisma.bingRetryQueue.findMany({ orderBy: { updatedAt: "desc" }, take: 5 });
    return { enabled: this.enabled, byStatus: grouped.map((g) => ({ status: g.status, count: g._count })), recent };
  }
}
