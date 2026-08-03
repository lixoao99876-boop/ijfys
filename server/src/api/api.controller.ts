import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Category } from "@prisma/client";
import { ApiService } from "./api.service";
import { SitePageService } from "../sitepage/sitepage.service";

const VALID_CATEGORIES: Category[] = [
  Category.movie,
  Category.tv,
  Category.anime,
  Category.variety,
  Category.short,
];

function assertCategory(input: string): Category {
  if (!VALID_CATEGORIES.includes(input as Category)) {
    throw new BadRequestException(`unknown category: ${input}`);
  }
  return input as Category;
}

@Controller()
export class ApiController {
  constructor(
    private readonly api: ApiService,
    private readonly sitePage: SitePageService,
  ) {}

  // ---------- 站点内容页（资讯/公告）公开读 ----------
  @Get("footer-links")
  footerLinks() {
    return this.sitePage.footerLinks();
  }

  @Get("announcements")
  announcements() {
    return this.sitePage.listPublicAnnouncements();
  }

  @Get("page/:slug")
  page(@Param("slug") slug: string) {
    return this.sitePage.getPublicBySlug(slug);
  }

  @Get("home")
  home() {
    return this.api.home();
  }

  @Get("search")
  search(
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.api.search(q ?? "", page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get("home/configured")
  configuredHome() {
    return this.api.configuredHome();
  }

  @Get("actor/:id")
  actor(@Param("id") id: string) {
    return this.api.actor(id);
  }

  @Get("actors")
  actors(
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.api.actorsList({
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("article/:id")
  article(@Param("id") id: string) {
    return this.api.article(id);
  }

  @Get("articles")
  articles(
    @Query("q") q?: string,
    @Query("type") typeName?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.api.articlesList({
      q,
      typeName,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ---------- 推荐 ----------
  @Get("recommend/popular")
  recommendPopular(@Query("category") category?: string, @Query("limit") limit?: string) {
    return this.api.recommendPopular(category, limit ? Number(limit) : undefined);
  }

  @Get("recommend/video/:id")
  recommendForVideo(@Param("id") id: string) {
    return this.api.recommendForVideo(id);
  }

  // ---------- 专题合集 ----------
  @Get("collections")
  collections() {
    return this.api.collectionsList();
  }

  @Get("collection/:slug")
  collectionBySlug(@Param("slug") slug: string) {
    return this.api.collectionBySlug(slug);
  }

  @Get("videos")
  videos(
    @Query("category") category: string,
    @Query("genre") genre?: string,
    @Query("region") region?: string,
    @Query("year") year?: string,
    @Query("sort") sort?: string,
  ) {
    // category=all / 空 表示跨分类（配合 genre 用，如 AI 板块）；此时必须有 genre 兜底
    const cat = category && category !== "all" ? assertCategory(category) : undefined;
    if (!cat && !genre) throw new BadRequestException("category or genre required");
    return this.api.listByCategory({
      category: cat,
      genre: genre || undefined,
      region: region || undefined,
      year: year || undefined,
      sort: (sort as "latest" | "score" | "year") || "latest",
    });
  }

  @Get("filters")
  filters(@Query("category") category: string) {
    return this.api.filtersForCategory(assertCategory(category));
  }

  @Get("video/:id")
  video(@Param("id") id: string) {
    return this.api.video(id);
  }

  @Get("play/:episodeId")
  play(@Param("episodeId") episodeId: string) {
    return this.api.play(episodeId);
  }

  @Post("play/:sourceId/failed")
  reportFailureLegacy(@Param("sourceId") sourceId: string) {
    return this.api.reportFailure(sourceId).then(() => ({ ok: true }));
  }

  @Post("play/:sourceId/ok")
  reportSuccessLegacy(
    @Param("sourceId") sourceId: string,
    @Body() body?: { responseTimeMs?: number; playDurationMs?: number },
  ) {
    return this.api
      .reportSuccess(sourceId, body?.responseTimeMs, body?.playDurationMs)
      .then(() => ({ ok: true }));
  }

  /**
   * 统一播放埋点入口（Phase 3 新增）
   *  body: { videoId, sourceId, episodeId, success, responseTimeMs?, playDurationMs? }
   */
  @Post("play/report")
  reportPlay(
    @Body()
    body: {
      videoId?: string;
      sourceId?: string;
      episodeId?: string;
      success?: boolean;
      responseTimeMs?: number;
      playDurationMs?: number;
    },
  ) {
    if (!body?.sourceId) throw new BadRequestException("sourceId required");
    return this.api.reportPlay(body).then(() => ({ ok: true }));
  }
}
