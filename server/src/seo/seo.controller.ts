import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { SeoService, type Engine } from "./seo.service";
import { GoogleScService } from "./google-sc.service";
import { YandexWebmasterService } from "./yandex-webmaster.service";

@Controller("seo")
export class SeoController {
  constructor(
    private readonly seo: SeoService,
    private readonly google: GoogleScService,
    private readonly yandex: YandexWebmasterService,
  ) {}

  @Get("status")
  status() {
    return this.seo.status();
  }

  @Post("submit")
  submit(@Body() body: { urls?: string[]; engines?: Engine[] }) {
    const urls = body?.urls ?? [];
    if (!Array.isArray(urls) || urls.length === 0) throw new BadRequestException("urls required");
    if (urls.length > 500) throw new BadRequestException("max 500 urls per call");
    return this.seo.submitUrls(urls, { engines: body?.engines });
  }

  @Post("resubmit-sitemap")
  resubmitSitemap() {
    return this.seo.resubmitSitemap();
  }

  @Get("queue")
  queue(@Query("engine") engine?: string, @Query("limit") limit?: string) {
    if (engine !== "bing" && engine !== "yandex") throw new BadRequestException("engine=bing|yandex");
    return this.seo.queue(engine, limit ? Math.min(200, Number(limit)) : 50);
  }

  // ---- GSC 数据读取（sc-deep）----
  @Get("gsc/opportunities")
  opportunities() {
    return this.google.getOpportunityKeywords();
  }

  @Get("gsc/low-ctr")
  lowCtr() {
    return this.google.getLowCtrPages();
  }

  @Get("gsc/rank-drops")
  rankDrops() {
    return this.google.getRankDropPages();
  }

  @Get("gsc/sitemap-status")
  sitemapStatus() {
    return this.google.getSitemapStatus();
  }

  @Get("yandex/indexing-history")
  yandexIndexing() {
    return this.yandex.indexingHistory();
  }
}
