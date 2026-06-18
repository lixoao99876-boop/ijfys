import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ProviderStatus, VideoStatus, HomeChannelKind, HomeSortStrategy } from "@prisma/client";
import { AdminService } from "./admin.service";
import { HomeConfigService } from "../home-config/home-config.service";
import { CollectionService } from "../collection/collection.service";
import { CommentService } from "../api/comment.service";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly homeConfig: HomeConfigService,
    private readonly collections: CollectionService,
    private readonly comments: CommentService,
  ) {}

  @Get("stats")
  stats() {
    return this.admin.stats();
  }

  @Get("rankings")
  rankings(@Query("limit") limit?: string) {
    return this.admin.dashboardRankings({ topLimit: limit ? Number(limit) : undefined });
  }

  @Get("popular-actors")
  popularActors(@Query("limit") limit?: string) {
    return this.admin.popularActors(limit ? Number(limit) : 100);
  }

  @Get("daily-stats")
  dailyStats(@Query("days") days?: string) {
    return this.admin.dailyStats(days ? Number(days) : 7);
  }

  @Get("videos")
  videos(
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("region") region?: string,
    @Query("year") year?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.videos({
      q,
      category,
      region,
      year,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch("videos/:id")
  editVideo(
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      originalTitle?: string | null;
      year?: number | null;
      region?: string | null;
      remarks?: string | null;
      description?: string | null;
      status?: VideoStatus;
    },
  ) {
    // 单独处理 status 切换
    if (body.status !== undefined && !VIDEO_STATUSES.includes(body.status)) {
      throw new BadRequestException("invalid status");
    }
    const editPart: typeof body = { ...body };
    delete editPart.status;
    const hasEdit = Object.keys(editPart).length > 0;
    const tasks: Promise<unknown>[] = [];
    if (hasEdit) tasks.push(this.admin.editVideo(id, editPart));
    if (body.status !== undefined) tasks.push(this.admin.setVideoStatus(id, body.status));
    return Promise.all(tasks).then(() => ({ ok: true }));
  }

  @Post("videos/bulk-status")
  bulkStatus(@Body() body: { ids: string[]; status: VideoStatus }) {
    if (!Array.isArray(body?.ids)) throw new BadRequestException("ids required");
    if (!VIDEO_STATUSES.includes(body?.status)) throw new BadRequestException("invalid status");
    return this.admin.bulkUpdateVideos(body.ids, body.status);
  }

  @Get("actors")
  actors(
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.actors({
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("articles")
  articles(
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.articles({
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("providers")
  providers() {
    return this.admin.providers();
  }

  @Post("providers/:code/sync")
  triggerSync(@Param("code") code: string, @Body() body?: { type?: "full" | "incremental" }) {
    return this.admin.triggerSync(code, body?.type ?? "incremental");
  }

  @Post("providers/:code/status")
  setProviderStatus(@Param("code") code: string, @Body() body: { status: ProviderStatus }) {
    if (!PROVIDER_STATUSES.includes(body?.status)) {
      throw new BadRequestException("invalid status");
    }
    return this.admin.setProviderStatus(code, body.status);
  }

  @Get("sources")
  sources(
    @Query("provider") providerCode?: string,
    @Query("quality") quality?: string,
    @Query("active") active?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.sources({
      providerCode,
      quality,
      active: active === undefined ? undefined : active === "true",
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("sync-logs")
  syncLogs(
    @Query("entity") entity?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.syncLogs({
      entity,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("admin-logs")
  adminLogs(
    @Query("action") action?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.adminLogs({
      action,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("popular")
  popular(@Query("metric") metric?: string, @Query("limit") limit?: string) {
    return this.admin.popular({
      metric: (metric as "score" | "recent") ?? "score",
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ---------- 首页配置 ----------
  @Get("home-config")
  getHomeConfig() {
    return this.homeConfig.listForAdmin();
  }

  @Patch("home-config/channels/:code")
  patchChannel(
    @Param("code") code: string,
    @Body() body: { title?: string; categoryFilter?: string | null; order?: number; itemLimit?: number; fillFromDb?: boolean; enabled?: boolean },
  ) {
    return this.homeConfig.updateChannel(code, body);
  }

  @Post("home-config/channels/:code/items")
  addChannelItem(@Param("code") code: string, @Body() body: { videoId: string }) {
    if (!body?.videoId) throw new BadRequestException("videoId required");
    return this.homeConfig.addItem(code, body.videoId);
  }

  @Post("home-config/channels/:code/items/:videoId/delete")
  removeChannelItem(@Param("code") code: string, @Param("videoId") videoId: string) {
    return this.homeConfig.removeItem(code, videoId);
  }

  @Post("home-config/channels/:code/reorder")
  reorderChannelItems(@Param("code") code: string, @Body() body: { videoIds: string[] }) {
    if (!Array.isArray(body?.videoIds)) throw new BadRequestException("videoIds required");
    return this.homeConfig.reorderItems(code, body.videoIds);
  }

  @Post("home-config/channels/reorder")
  reorderChannels(@Body() body: { codes: string[] }) {
    if (!Array.isArray(body?.codes)) throw new BadRequestException("codes required");
    return this.homeConfig.reorderChannels(body.codes);
  }

  @Post("home-config/channels")
  createChannel(@Body() body: { code: string; title: string; kind?: HomeChannelKind; collectionId?: string; sortStrategy?: HomeSortStrategy; categoryFilter?: string | null; itemLimit?: number }) {
    return this.homeConfig.createChannel(body);
  }

  @Post("home-config/channels/:code/delete")
  deleteChannel(@Param("code") code: string) {
    return this.homeConfig.deleteChannel(code);
  }

  // ---------- 专题合集 ----------
  @Get("collections")
  listCollections() {
    return this.collections.listAdmin();
  }

  @Get("collections/:id")
  getCollection(@Param("id") id: string) {
    return this.collections.detailAdmin(id);
  }

  @Post("collections")
  createCollection(@Body() body: { slug: string; title: string; description?: string; cover?: string }) {
    return this.collections.create(body);
  }

  @Patch("collections/:id")
  updateCollection(
    @Param("id") id: string,
    @Body() body: { slug?: string; title?: string; description?: string | null; cover?: string | null; enabled?: boolean },
  ) {
    return this.collections.update(id, body);
  }

  @Post("collections/:id/delete")
  deleteCollection(@Param("id") id: string) {
    return this.collections.remove(id);
  }

  @Post("collections/:id/items")
  addCollectionItem(@Param("id") id: string, @Body() body: { videoId: string }) {
    if (!body?.videoId) throw new BadRequestException("videoId required");
    return this.collections.addItem(id, body.videoId);
  }

  @Post("collections/:id/items/:videoId/delete")
  removeCollectionItem(@Param("id") id: string, @Param("videoId") videoId: string) {
    return this.collections.removeItem(id, videoId);
  }

  @Post("collections/:id/reorder")
  reorderCollection(@Param("id") id: string, @Body() body: { videoIds: string[] }) {
    if (!Array.isArray(body?.videoIds)) throw new BadRequestException("videoIds required");
    return this.collections.reorderItems(id, body.videoIds);
  }

  // ---------- 评论审核 ----------
  @Get("comments")
  listComments(
    @Query("status") status?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.comments.adminList({
      status,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post("comments/:id/approve")
  approveComment(@Param("id") id: string) {
    return this.comments.moderate(id, "approve");
  }

  @Post("comments/:id/reject")
  rejectComment(@Param("id") id: string, @Body() body: { reason?: string }) {
    return this.comments.moderate(id, "reject", body?.reason);
  }

  @Post("comments/bulk-moderate")
  bulkModerateComments(@Body() body: { ids: string[]; action: "approve" | "reject"; reason?: string }) {
    if (!Array.isArray(body?.ids)) throw new BadRequestException("ids required");
    return this.comments.bulkModerate(body.ids, body.action, body.reason);
  }

  @Post("comments/:id/delete")
  deleteComment(@Param("id") id: string) {
    return this.comments.adminDelete(id);
  }

  // ---------- 搜索索引管理 ----------
  @Post("search/reindex")
  async reindex() {
    return this.admin.reindexSearch();
  }

  @Get("search/stats")
  searchStats() {
    return this.admin.searchStats();
  }
}

const VIDEO_STATUSES: VideoStatus[] = [
  VideoStatus.PUBLISHED,
  VideoStatus.UNPUBLISHED,
  VideoStatus.DELETED,
];
const PROVIDER_STATUSES: ProviderStatus[] = [
  ProviderStatus.ACTIVE,
  ProviderStatus.PAUSED,
  ProviderStatus.DISABLED,
];
