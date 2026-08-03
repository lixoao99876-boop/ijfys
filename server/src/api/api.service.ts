import { Injectable, NotFoundException } from "@nestjs/common";
import { Category, Prisma, VideoStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ScoringService } from "../scoring/scoring.service";
import { FULL_VIDEO_INCLUDE, toDTO, VideoDTO } from "./video.mapper";
import { HomeConfigService } from "../home-config/home-config.service";
import { CollectionService } from "../collection/collection.service";
import { RecommendationService } from "../recommendation/recommendation.service";
import { SearchService } from "../search/search.service";
import {
  GENRE_LABELS,
  REGION_LABELS,
  YEAR_LABELS,
  genreFilter,
  regionFilter,
  yearFilter,
} from "./filter-aggregations";

const HOT_KEYWORDS = ["三体", "鬼灭", "继承之战", "脱口秀", "重生", "总裁", "巨人", "Running Man"];

export type CategoryParam = Category;

@Injectable()
export class ApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly homeConfig: HomeConfigService,
    private readonly collections: CollectionService,
    private readonly recommendation: RecommendationService,
    private readonly searchSvc: SearchService,
  ) {}

  // ---------- 首页 ----------
  async home(): Promise<{
    banner: VideoDTO[];
    recent: VideoDTO[];
    top: VideoDTO[];
    byCategory: Record<string, VideoDTO[]>;
  }> {
    const pub = { status: VideoStatus.PUBLISHED } as const;
    const [banner, recent, top, movie, tv, anime, variety, short] = await Promise.all([
      this.findMany({ where: pub, orderBy: [{ score: "desc" }], take: 5 }),
      this.findMany({ where: pub, orderBy: [{ sourceUpdatedAt: "desc" }], take: 12 }),
      this.findMany({ where: pub, orderBy: [{ score: "desc" }], take: 6 }),
      this.findMany({ where: { ...pub, category: Category.movie }, orderBy: [{ sourceUpdatedAt: "desc" }], take: 6 }),
      this.findMany({ where: { ...pub, category: Category.tv }, orderBy: [{ sourceUpdatedAt: "desc" }], take: 6 }),
      this.findMany({ where: { ...pub, category: Category.anime }, orderBy: [{ sourceUpdatedAt: "desc" }], take: 6 }),
      this.findMany({ where: { ...pub, category: Category.variety }, orderBy: [{ sourceUpdatedAt: "desc" }], take: 6 }),
      this.findMany({ where: { ...pub, category: Category.short }, orderBy: [{ sourceUpdatedAt: "desc" }], take: 6 }),
    ]);
    return {
      banner,
      recent,
      top,
      byCategory: { movie, tv, anime, variety, short },
    };
  }

  // ---------- 搜索（多类型 + trigram 模糊） ----------
  async search(
    q: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: VideoDTO[];
    hot: string[];
    total: number;
    page: number;
    limit: number;
    actors: Array<{ id: string; name: string; cover: string | null; area: string | null }>;
    articles: Array<{ id: string; title: string; cover: string | null; typeName: string | null }>;
  }> {
    const keyword = q.trim();
    if (!keyword) {
      const trending = await this.prisma.searchLog.findMany({
        orderBy: [{ hits: "desc" }],
        take: 10,
        select: { keyword: true },
      });
      return {
        items: [],
        hot: trending.length > 0 ? trending.map((t) => t.keyword) : HOT_KEYWORDS,
        total: 0,
        page: 1,
        limit,
        actors: [],
        articles: [],
      };
    }
    void this.logSearch(keyword).catch(() => {});
    const pg = Math.max(1, page);
    const lm = Math.min(60, Math.max(1, limit));

    // 优先 Meilisearch；失败 fallback 到 ILIKE + trgm
    const meili = await this.searchSvc.search(keyword, pg, lm);
    if (meili && meili.hits.length > 0) {
      const ids = meili.hits.map((h) => h.id);
      const videos = await this.prisma.video.findMany({
        where: { id: { in: ids }, status: VideoStatus.PUBLISHED },
        include: FULL_VIDEO_INCLUDE,
      });
      const byId = new Map(videos.map((v) => [v.id, v]));
      const ordered = ids.map((id) => byId.get(id)).filter((v): v is NonNullable<typeof v> => !!v).map(toDTO);
      const [actors, articles] = pg === 1 ? await Promise.all([
        this.prisma.actor.findMany({
          where: { OR: [{ name: { contains: keyword, mode: "insensitive" } }, { alias: { contains: keyword, mode: "insensitive" } }] },
          orderBy: { sourceUpdatedAt: "desc" },
          take: 6,
          select: { id: true, name: true, cover: true, area: true },
        }),
        this.prisma.article.findMany({
          where: { title: { contains: keyword, mode: "insensitive" } },
          orderBy: { sourceUpdatedAt: "desc" },
          take: 4,
          select: { id: true, title: true, cover: true, typeName: true },
        }),
      ]) : [[], []];
      return { items: ordered, hot: HOT_KEYWORDS, total: meili.total, page: pg, limit: lm, actors, articles };
    }

    // 视频：title/originalTitle/director ILIKE + actors/genres has
    const where: Prisma.VideoWhereInput = {
      status: VideoStatus.PUBLISHED,
      OR: [
        { title: { contains: keyword, mode: "insensitive" } },
        { originalTitle: { contains: keyword, mode: "insensitive" } },
        { director: { contains: keyword, mode: "insensitive" } },
        { actors: { has: keyword } },
        { genres: { has: keyword } },
      ],
    };
    const [items, total, actors, articles] = await Promise.all([
      this.findMany({
        where,
        orderBy: [{ playCount: "desc" }, { score: "desc" }, { sourceUpdatedAt: "desc" }],
        skip: (pg - 1) * lm,
        take: lm,
      }),
      this.prisma.video.count({ where }),
      pg === 1
        ? this.prisma.actor.findMany({
            where: {
              OR: [
                { name: { contains: keyword, mode: "insensitive" } },
                { alias: { contains: keyword, mode: "insensitive" } },
              ],
            },
            orderBy: { sourceUpdatedAt: "desc" },
            take: 6,
            select: { id: true, name: true, cover: true, area: true },
          })
        : Promise.resolve([]),
      pg === 1
        ? this.prisma.article.findMany({
            where: { title: { contains: keyword, mode: "insensitive" } },
            orderBy: { sourceUpdatedAt: "desc" },
            take: 4,
            select: { id: true, title: true, cover: true, typeName: true },
          })
        : Promise.resolve([]),
    ]);

    // 如果视频精确匹配为 0，启用 trigram 模糊匹配（pg_trgm 已建）
    let finalItems = items;
    let finalTotal = total;
    if (total === 0 && pg === 1) {
      const fuzzy = await this.prisma.$queryRaw<Array<{ id: string }>>`
        select id from videos
        where status = 'PUBLISHED'
          and (
            similarity(title, ${keyword}) > 0.2
            or similarity(coalesce("originalTitle", ''), ${keyword}) > 0.2
          )
        order by greatest(similarity(title, ${keyword}), similarity(coalesce("originalTitle", ''), ${keyword})) desc
        limit ${lm}
      `;
      if (fuzzy.length > 0) {
        const ids = fuzzy.map((r) => r.id);
        const fuzzyVideos = await this.prisma.video.findMany({
          where: { id: { in: ids } },
          include: FULL_VIDEO_INCLUDE,
        });
        const map = new Map(fuzzyVideos.map((v) => [v.id, v]));
        finalItems = ids.map((id) => map.get(id)).filter((v): v is NonNullable<typeof v> => !!v).map(toDTO);
        finalTotal = fuzzy.length;
      }
    }

    return { items: finalItems, hot: HOT_KEYWORDS, total: finalTotal, page: pg, limit: lm, actors, articles };
  }

  // ---------- 演员详情 + 作品列表 ----------
  async actor(id: string): Promise<{
    actor: Awaited<ReturnType<PrismaService["actor"]["findUnique"]>>;
    works: VideoDTO[];
  }> {
    const actor = await this.prisma.actor.findUnique({ where: { id } });
    if (!actor) throw new NotFoundException("actor not found");
    // 反查：videos.actors 数组中含该演员姓名
    const works = await this.findMany({
      where: { status: VideoStatus.PUBLISHED, actors: { has: actor.name } },
      orderBy: [{ score: "desc" }, { sourceUpdatedAt: "desc" }],
      take: 60,
    });
    return { actor, works };
  }

  async actorsList(params: { q?: string; page?: number; limit?: number }) {
    const pg = Math.max(1, params.page ?? 1);
    const lm = Math.min(60, Math.max(1, params.limit ?? 24));
    const where: Prisma.ActorWhereInput = {};
    if (params.q) where.name = { contains: params.q, mode: "insensitive" };
    const [items, total] = await Promise.all([
      this.prisma.actor.findMany({
        where,
        orderBy: [{ sourceUpdatedAt: "desc" }],
        skip: (pg - 1) * lm,
        take: lm,
        select: { id: true, name: true, sex: true, area: true, cover: true, works: true, birthday: true },
      }),
      this.prisma.actor.count({ where }),
    ]);
    return { items, total, page: pg, limit: lm };
  }

  // ---------- 文章详情 + 上下篇 + 相关 ----------
  async article(id: string): Promise<{
    article: Awaited<ReturnType<PrismaService["article"]["findUnique"]>>;
    prev: { id: string; title: string } | null;
    next: { id: string; title: string } | null;
    related: Array<{ id: string; title: string; cover: string | null; typeName: string | null; sourceUpdatedAt: Date | null }>;
  }> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException("article not found");
    const anchor = article.sourceUpdatedAt ?? article.createdAt;
    const [prev, next, related] = await Promise.all([
      this.prisma.article.findFirst({
        where: { sourceUpdatedAt: { lt: anchor }, id: { not: id } },
        orderBy: { sourceUpdatedAt: "desc" },
        select: { id: true, title: true },
      }),
      this.prisma.article.findFirst({
        where: { sourceUpdatedAt: { gt: anchor }, id: { not: id } },
        orderBy: { sourceUpdatedAt: "asc" },
        select: { id: true, title: true },
      }),
      this.prisma.article.findMany({
        where: { id: { not: id }, typeName: article.typeName ?? undefined },
        orderBy: { sourceUpdatedAt: "desc" },
        take: 6,
        select: { id: true, title: true, cover: true, typeName: true, sourceUpdatedAt: true },
      }),
    ]);
    return { article, prev, next, related };
  }

  async articlesList(params: { q?: string; typeName?: string; page?: number; limit?: number }) {
    const pg = Math.max(1, params.page ?? 1);
    const lm = Math.min(60, Math.max(1, params.limit ?? 20));
    const where: Prisma.ArticleWhereInput = {};
    if (params.q) where.title = { contains: params.q, mode: "insensitive" };
    if (params.typeName) where.typeName = params.typeName;
    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: [{ sourceUpdatedAt: "desc" }],
        skip: (pg - 1) * lm,
        take: lm,
        select: {
          id: true,
          title: true,
          typeName: true,
          author: true,
          cover: true,
          blurb: true,
          hits: true,
          sourceUpdatedAt: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);
    return { items, total, page: pg, limit: lm };
  }

  // ---------- 公网首页：基于 home_channels 配置 ----------
  async configuredHome() {
    return this.homeConfig.getPublic();
  }

  private async logSearch(keyword: string): Promise<void> {
    const norm = keyword.toLowerCase().slice(0, 64);
    if (!norm) return;
    await this.prisma.searchLog.upsert({
      where: { keyword: norm },
      create: { keyword: norm },
      update: { hits: { increment: 1 }, lastSearchedAt: new Date() },
    });
  }

  // ---------- 分类列表 + 筛选 ----------
  // genre / region / year 都是"聚合标签"（如 "动作" / "大陆" / "2010年代"），
  // 由 filter-aggregations 翻译成 DB 上的原始值或范围查询。
  async listByCategory(params: {
    category?: CategoryParam;
    genre?: string;
    region?: string;
    year?: string;
    sort?: "latest" | "score" | "year";
    take?: number;
  }): Promise<{ items: VideoDTO[]; total: number }> {
    // category 可空：AI 板块跨分类按 genre 取；空时靠 genre/region/year 收敛
    const conds: Prisma.VideoWhereInput[] = [{ status: VideoStatus.PUBLISHED }];
    if (params.category) conds.push({ category: params.category });
    const g = genreFilter(params.genre);
    const r = regionFilter(params.region);
    const y = yearFilter(params.year);
    if (g) conds.push(g);
    if (r) conds.push(r);
    if (y) conds.push(y);
    const where: Prisma.VideoWhereInput = conds.length === 1 ? conds[0] : { AND: conds };

    const orderBy: Prisma.VideoOrderByWithRelationInput[] =
      params.sort === "score"
        ? [{ score: "desc" }]
        : params.sort === "year"
          ? [{ year: "desc" }]
          : [{ sourceUpdatedAt: "desc" }];

    const [items, total] = await Promise.all([
      this.findMany({ where, orderBy, take: params.take ?? 120 }),
      this.prisma.video.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * 筛选项白名单：不查 DB，直接返回前端展示用的固定聚合标签。
   * `category` 参数保留接口形状，但当前所有分类共享同一套标签。
   */
  filtersForCategory(_category: CategoryParam): {
    regions: string[];
    years: string[];
    genres: string[];
  } {
    return {
      genres: GENRE_LABELS,
      regions: REGION_LABELS,
      years: YEAR_LABELS,
    };
  }

  // ---------- 视频详情 + 多维度推荐 ----------
  async video(id: string): Promise<{
    video: VideoDTO;
    recommendations: VideoDTO[];
    byActor: VideoDTO[];
    byDirector: VideoDTO[];
    byGenre: VideoDTO[];
  }> {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: FULL_VIDEO_INCLUDE,
    });
    if (!video || video.status !== VideoStatus.PUBLISHED) throw new NotFoundException("video not found");

    const rec = await this.recommendation.forVideo(id);
    return {
      video: toDTO(video),
      recommendations: rec.similar, // 兼容旧字段
      byActor: rec.byActor,
      byDirector: rec.byDirector,
      byGenre: rec.byGenre,
    };
  }

  // ---------- 推荐 ----------
  async recommendPopular(category?: string, limit?: number): Promise<VideoDTO[]> {
    const valid: Category[] = [Category.movie, Category.tv, Category.anime, Category.variety, Category.short];
    const cat = category && valid.includes(category as Category) ? (category as Category) : undefined;
    return this.recommendation.popular({ category: cat, limit });
  }

  async recommendForVideo(id: string) {
    return this.recommendation.forVideo(id);
  }

  // ---------- 专题合集 ----------
  collectionsList() {
    return this.collections.listPublic();
  }
  collectionBySlug(slug: string) {
    return this.collections.getBySlug(slug);
  }

  // ---------- 播放（解析单集） ----------
  async play(episodeId: string): Promise<{
    video: { id: string; title: string };
    episode: { id: string; name: string; index: number };
    sources: Array<{
      sourceId: string;
      sourceName: string;
      lineName: string;
      quality: string;
      m3u8Url: string;
      score: number;
      best: boolean;
    }>;
  }> {
    const ep = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        video: { select: { id: true, title: true } },
        sourceEpisodes: {
          where: { isValid: true },
          include: { source: true },
        },
      },
    });
    if (!ep) throw new NotFoundException("episode not found");

    const sourcesSorted = [...ep.sourceEpisodes]
      .filter((se) => se.source.isActive)
      .sort((a, b) => b.source.score - a.source.score);

    const bestId = sourcesSorted[0]?.source.id;
    return {
      video: ep.video,
      episode: { id: ep.id, name: ep.name, index: ep.index },
      sources: sourcesSorted.map((se) => ({
        sourceId: se.source.id,
        sourceName: se.source.sourceName,
        lineName: se.source.lineName,
        quality: se.source.quality,
        m3u8Url: se.m3u8Url,
        score: se.source.score,
        best: se.source.id === bestId,
      })),
    };
  }

  // ---------- 上报失败/成功 ----------
  reportFailure(sourceId: string) {
    return this.scoring.reportFailure(sourceId);
  }
  reportSuccess(sourceId: string, responseTimeMs?: number, playDurationMs?: number) {
    return this.scoring.reportSuccess(sourceId, responseTimeMs, playDurationMs);
  }

  /** Phase 3 统一播放埋点 */
  async reportPlay(p: {
    videoId?: string;
    sourceId?: string;
    episodeId?: string;
    success?: boolean;
    responseTimeMs?: number;
    playDurationMs?: number;
  }): Promise<void> {
    if (!p.sourceId) return;
    if (p.success === false) {
      await this.scoring.reportFailure(p.sourceId);
    } else {
      await this.scoring.reportSuccess(p.sourceId, p.responseTimeMs, p.playDurationMs);
    }
  }

  // ---------- 内部 ----------
  private async findMany(args: Prisma.VideoFindManyArgs): Promise<VideoDTO[]> {
    const rows = await this.prisma.video.findMany({ ...args, include: FULL_VIDEO_INCLUDE });
    return rows.map(toDTO);
  }
}

