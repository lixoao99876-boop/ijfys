import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { BingIndexnowService } from "./bing-indexnow.service";
import { YandexWebmasterService } from "./yandex-webmaster.service";
import { GoogleScService } from "./google-sc.service";

export type Engine = "bing" | "yandex" | "google";

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bing: BingIndexnowService,
    private readonly yandex: YandexWebmasterService,
    private readonly google: GoogleScService,
  ) {}

  private get siteUrl(): string {
    return (process.env.PUBLIC_SITE_URL ?? "https://aiskill88.xyz").replace(/\/+$/, "");
  }

  /** 三路提交入口。google 无单 URL 通道，传了也只做 sitemap 重提交。priority 传给 yandex 队列 */
  async submitUrls(urls: string[], opts: { engines?: Engine[]; priority?: number } = {}) {
    const engines = opts.engines ?? ["bing", "yandex"];
    const dedup = [...new Set(urls)].filter((u) => u.startsWith(this.siteUrl));
    const out: Record<string, unknown> = { total: dedup.length };
    if (dedup.length === 0) return out;

    if (engines.includes("bing")) out.bing = await this.bing.submitBatch(dedup);
    if (engines.includes("yandex")) out.yandex = await this.yandex.submitUrls(dedup, opts.priority ?? 0);
    if (engines.includes("google")) out.google = await this.google.submitSitemap();
    return out;
  }

  /** 回填 Yandex backlog 优先级（高价值已补齐页顶到前面） */
  async reprioritizeYandex() {
    return this.yandex.reprioritizeBacklog();
  }

  /** sitemap 三引擎重提交 */
  async resubmitSitemap() {
    const sitemapUrl = `${this.siteUrl}/sitemap.xml`;
    const [googlePut, googlePing, yandexAdd, bingHint] = await Promise.all([
      this.google.submitSitemap(sitemapUrl),
      this.google.pingSitemap(),
      this.yandex.addSitemap(sitemapUrl),
      // IndexNow 没有 sitemap 概念，提示首页即可触发爬 robots→sitemap
      this.bing.submitBatch([this.siteUrl + "/"]),
    ]);
    return { sitemapUrl, google: { put: googlePut, ping: googlePing }, yandex: yandexAdd, bing: bingHint };
  }

  async status() {
    const [bing, yandex] = await Promise.all([this.bing.stats(), this.yandex.stats()]);
    return {
      site: this.siteUrl,
      engines: {
        bing,
        yandex,
        google: { enabled: this.google.enabled },
      },
    };
  }

  async queue(engine: "bing" | "yandex", limit = 50) {
    if (engine === "bing")
      return this.prisma.bingRetryQueue.findMany({ orderBy: { updatedAt: "desc" }, take: limit });
    return this.prisma.yandexRecrawlQueue.findMany({ orderBy: { updatedAt: "desc" }, take: limit });
  }

  // ---------- 编排 cron（全部 Asia/Shanghai，VPS=UTC 必须显式时区） ----------

  /** 02:00 把近 24h 新增/更新的视频提交 bing+yandex */
  @Cron("0 2 * * *", { name: "seo-daily-submit", timeZone: "Asia/Shanghai" })
  async cronDailySubmit() {
    const since = new Date(Date.now() - 24 * 3600_000);
    const rows = await this.prisma.video.findMany({
      where: { status: "PUBLISHED", updatedAt: { gte: since } },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    const urls = rows.map((v) => `${this.siteUrl}/vod/${v.id}`);
    // 新片给 priority 100，在 Yandex 队列里插到 backlog 前面
    const res = await this.submitUrls(urls, { priority: 100 });
    this.logger.log(`seo-daily-submit: ${urls.length} urls → ${JSON.stringify(res).slice(0, 300)}`);
  }

  /** 01:45 回填 backlog 优先级（赶在 02:00 提交 / 03:00 drain 前，把昨日新补齐的高价值页顶上来） */
  @Cron("45 1 * * *", { name: "seo-reprioritize-yandex", timeZone: "Asia/Shanghai" })
  async cronReprioritizeYandex() {
    const res = await this.reprioritizeYandex();
    this.logger.log(`seo-reprioritize-yandex: ${JSON.stringify(res)}`);
  }

  @Cron("30 2 * * *", { name: "seo-drain-bing", timeZone: "Asia/Shanghai" })
  async cronDrainBing() {
    const res = await this.bing.drainQueue({ batchSize: 50, gapMs: 2000 });
    this.logger.log(`seo-drain-bing: ${JSON.stringify(res)}`);
  }

  @Cron("0 3 * * *", { name: "seo-drain-yandex", timeZone: "Asia/Shanghai" })
  async cronDrainYandex() {
    const res = await this.yandex.drainQueue({ batchSize: 50 });
    this.logger.log(`seo-drain-yandex: ${JSON.stringify(res)}`);
  }

  @Cron("0 4 * * *", { name: "seo-resubmit-sitemap", timeZone: "Asia/Shanghai" })
  async cronResubmitSitemap() {
    const res = await this.resubmitSitemap();
    this.logger.log(`seo-resubmit-sitemap: ${JSON.stringify(res).slice(0, 300)}`);
  }
}
