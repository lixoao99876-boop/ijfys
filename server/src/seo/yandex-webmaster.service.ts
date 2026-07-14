import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Yandex Webmaster API v4（迁写自 aiskill88 services/yandex-webmaster.js）
 * 陷阱备忘：
 *  - Authorization header 是 `OAuth <token>`，不是 Bearer
 *  - 端点是 `indexing/history`，不是 `indexing-history`
 *  - recrawl 有每日 quota，先查 /recrawl/quota
 */
const API_BASE = "https://api.webmaster.yandex.net/v4";
const TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class YandexWebmasterService {
  private readonly logger = new Logger(YandexWebmasterService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get token(): string | undefined {
    return process.env.YANDEX_OAUTH_TOKEN || undefined;
  }

  private get hostBase(): string {
    const uid = process.env.YANDEX_USER_ID;
    const hostId = process.env.YANDEX_HOST_ID; // e.g. https:aiskill88.xyz:443
    return `${API_BASE}/user/${uid}/hosts/${encodeURIComponent(hostId ?? "")}`;
  }

  get enabled(): boolean {
    return !!(this.token && process.env.YANDEX_USER_ID && process.env.YANDEX_HOST_ID);
  }

  private async request<T = unknown>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: T | null; error?: string }> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.hostBase}${path}`, {
        method,
        headers: {
          Authorization: `OAuth ${this.token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctl.signal,
      });
      let json: T | null = null;
      try {
        json = (await res.json()) as T;
      } catch {
        /* 202 等可能无 body */
      }
      return { status: res.status, json };
    } catch (e) {
      return { status: 0, json: null, error: e instanceof Error ? e.message : String(e) };
    } finally {
      clearTimeout(timer);
    }
  }

  async getQuota(): Promise<{ dailyQuota: number; remainder: number } | null> {
    const r = await this.request<{ daily_quota: number; quota_remainder: number }>("GET", "/recrawl/quota");
    if (r.status !== 200 || !r.json) return null;
    return { dailyQuota: r.json.daily_quota, remainder: r.json.quota_remainder };
  }

  /** 单 URL 强制重抓。202 = 已入 yandex 队列 */
  async recrawlUrl(url: string): Promise<{ ok: boolean; taskId?: string; status: number; error?: string }> {
    const r = await this.request<{ task_id: string }>("POST", "/recrawl/queue/", { url });
    if (r.status === 202 || r.status === 201 || r.status === 200) {
      const taskId = r.json?.task_id;
      await this.prisma.yandexRecrawlQueue.upsert({
        where: { url },
        create: { url, status: "submitted", attempts: 1, taskId },
        update: { status: "submitted", attempts: { increment: 1 }, taskId, lastError: null },
      });
      return { ok: true, taskId, status: r.status };
    }
    const reason = r.error ?? `HTTP ${r.status}: ${JSON.stringify(r.json).slice(0, 200)}`;
    await this.enqueueRetry(url, reason);
    return { ok: false, status: r.status, error: reason };
  }

  /** 批量提交（quota 感知）：额度内直接提交，超出部分入队等次日 drain */
  async submitUrls(urls: string[]): Promise<{ submitted: number; enqueued: number; quotaRemainder?: number }> {
    if (!this.enabled) return { submitted: 0, enqueued: 0 };
    const quota = await this.getQuota();
    const budget = quota?.remainder ?? 0;
    let submitted = 0;
    let enqueued = 0;

    for (const url of urls) {
      if (submitted >= budget) {
        await this.enqueueRetry(url, "quota exhausted");
        enqueued++;
        continue;
      }
      const r = await this.recrawlUrl(url);
      if (r.ok) submitted++;
      else enqueued++;
      await sleep(500); // 礼貌间隔
    }
    return { submitted, enqueued, quotaRemainder: quota?.remainder };
  }

  async enqueueRetry(url: string, reason: string): Promise<void> {
    await this.prisma.yandexRecrawlQueue.upsert({
      where: { url },
      create: { url, status: "pending_retry", attempts: 0, lastError: reason },
      update: { status: "pending_retry", lastError: reason },
    });
  }

  async drainQueue(opts: { batchSize?: number } = {}): Promise<{ drained: number; ok: number; failed: number }> {
    const { batchSize = 50 } = opts;
    if (!this.enabled) return { drained: 0, ok: 0, failed: 0 };

    const quota = await this.getQuota();
    const budget = Math.min(batchSize, quota?.remainder ?? 0);
    let ok = 0;

    const rows = await this.prisma.yandexRecrawlQueue.findMany({
      where: { status: "pending_retry", attempts: { lt: MAX_ATTEMPTS } },
      take: budget,
      orderBy: { updatedAt: "asc" },
    });
    for (const row of rows) {
      await this.prisma.yandexRecrawlQueue.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      const r = await this.recrawlUrl(row.url);
      if (r.ok) ok++;
      await sleep(500);
    }

    const dead = await this.prisma.yandexRecrawlQueue.updateMany({
      where: { status: "pending_retry", attempts: { gte: MAX_ATTEMPTS } },
      data: { status: "failed" },
    });
    return { drained: rows.length, ok, failed: dead.count };
  }

  /** 把 sitemap 登记到 Yandex（幂等：已存在返回错误码忽略即可） */
  async addSitemap(sitemapUrl: string): Promise<{ ok: boolean; status: number; detail?: unknown }> {
    const r = await this.request("POST", "/user-added-sitemaps/", { url: sitemapUrl });
    // 201=新增成功；409/400 SITEMAP_ALREADY_ADDED 视为幂等成功
    const already = r.status === 409 || (r.status === 400 && JSON.stringify(r.json ?? "").includes("ALREADY"));
    return { ok: r.status === 201 || already, status: r.status, detail: r.json };
  }

  async getSitemaps(): Promise<unknown> {
    const r = await this.request("GET", "/user-added-sitemaps/");
    return r.json;
  }

  /** 收录曲线（注意端点拼写 indexing/history） */
  async indexingHistory(): Promise<unknown> {
    const r = await this.request("GET", "/indexing/history?indicator=SEARCHABLE&indicator=DOWNLOADED&indicator=HTTP_2XX");
    return r.json;
  }

  async stats() {
    const grouped = await this.prisma.yandexRecrawlQueue.groupBy({ by: ["status"], _count: true });
    const recent = await this.prisma.yandexRecrawlQueue.findMany({ orderBy: { updatedAt: "desc" }, take: 5 });
    const quota = this.enabled ? await this.getQuota() : null;
    return { enabled: this.enabled, quota, byStatus: grouped.map((g) => ({ status: g.status, count: g._count })), recent };
  }
}
