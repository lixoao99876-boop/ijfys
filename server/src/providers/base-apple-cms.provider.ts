import { Logger } from "@nestjs/common";
import { AppleCmsClient } from "../apple-cms/apple-cms.client";
import {
  buildExternalKey,
  detectCategory,
  detectQuality,
  normalizeActor,
  normalizeArticle,
  parsePlay,
  safeDate,
  safeScore,
  safeYear,
  splitList,
  type NormalizedActor,
  type NormalizedArticle,
} from "../apple-cms/apple-cms.parser";
import type { AppleCmsActor, AppleCmsArticle, AppleCmsVod } from "../apple-cms/apple-cms.types";
import type {
  FetchOptions,
  FetchResult,
  NormalizedVod,
  ProviderAdapter,
} from "./provider.interface";

export abstract class BaseAppleCmsProvider implements ProviderAdapter {
  abstract readonly code: string;
  abstract readonly name: string;
  abstract readonly baseUrl: string;

  /** 子类可覆写：备用域名列表（带 /provide/vod 完整路径，actor/art 路径自动派生） */
  protected get backupUrls(): string[] {
    return [];
  }

  /** 子类可覆写：是否支持演员/资讯同步 */
  readonly supportsActor: boolean = false;
  readonly supportsArticle: boolean = false;

  protected logger = new Logger(this.constructor.name);
  private _client?: AppleCmsClient;

  protected get client(): AppleCmsClient {
    if (!this._client) {
      const urls = [this.baseUrl, ...this.backupUrls].filter(Boolean);
      this._client = new AppleCmsClient(urls);
    }
    return this._client;
  }

  async fetchPage(opts: FetchOptions): Promise<FetchResult<NormalizedVod>> {
    const page = opts.page ?? 1;
    const resp = await this.client.fetchDetailPage({ page, hours: opts.hours });
    const items = resp.list
      .map((vod) => this.normalize(vod as AppleCmsVod))
      .filter((v): v is NormalizedVod => !!v);
    return {
      page: Number(resp.page) || page,
      pageCount: Number(resp.pagecount) || 1,
      items,
    };
  }

  async fetchActorPage(opts: FetchOptions): Promise<FetchResult<NormalizedActor>> {
    const page = opts.page ?? 1;
    const resp = await this.client.fetchActorPage({ page, hours: opts.hours });
    const items = resp.list
      .map((a) => normalizeActor(a as unknown as AppleCmsActor))
      .filter((v): v is NormalizedActor => !!v);
    return {
      page: Number(resp.page) || page,
      pageCount: Number(resp.pagecount) || 1,
      items,
    };
  }

  async fetchArticlePage(opts: FetchOptions): Promise<FetchResult<NormalizedArticle>> {
    const page = opts.page ?? 1;
    const resp = await this.client.fetchArticlePage({ page, hours: opts.hours });
    const items = resp.list
      .map((a) => normalizeArticle(a as unknown as AppleCmsArticle))
      .filter((v): v is NormalizedArticle => !!v);
    return {
      page: Number(resp.page) || page,
      pageCount: Number(resp.pagecount) || 1,
      items,
    };
  }

  async ping(): Promise<boolean> {
    return this.client.ping("vod");
  }

  /** 子类可覆写：站点特定的字段微调 */
  protected normalize(vod: AppleCmsVod): NormalizedVod | null {
    if (!vod?.vod_name) return null;
    const category = detectCategory(vod.type_name);
    const year = safeYear(vod.vod_year);
    const parsed = parsePlay(vod);

    const sources = parsed
      .filter((p) => p.episodes.length > 0)
      .map((p, srcIdx) => ({
        playFromCode: p.code,
        sourceName: `线路 ${String.fromCharCode(65 + srcIdx)}`,
        lineName: this.guessLineName(p.code),
        quality: detectQuality(p.code, vod.vod_remarks ?? ""),
        totalEpisodes: p.episodes.length,
        episodes: p.episodes.map((e) => ({ index: e.index, name: e.name, m3u8Url: e.url })),
      }));

    // 没有可播放线路的 vod 直接丢弃（无法播放对前端无意义）
    if (sources.length === 0) return null;

    return {
      providerCode: this.code,
      providerVodId: String(vod.vod_id),
      title: vod.vod_name.trim(),
      originalTitle: vod.vod_sub?.trim() || undefined,
      category,
      year,
      region: vod.vod_area?.trim() || null,
      cover: vod.vod_pic?.trim() || null,
      backdrop: vod.vod_pic_slide?.trim() || vod.vod_pic?.trim() || null,
      description: (vod.vod_content ?? vod.vod_blurb ?? "").replace(/<[^>]+>/g, "").trim() || null,
      director: vod.vod_director?.trim() || null,
      actors: splitList(vod.vod_actor),
      genres: splitList(vod.vod_class).length ? splitList(vod.vod_class) : (vod.type_name ? [vod.type_name] : []),
      remarks: vod.vod_remarks?.trim() || null,
      score: safeScore(vod.vod_score),
      sourceUpdatedAt: safeDate(vod.vod_time),
      sources,
    };
  }

  protected guessLineName(code: string): string {
    const c = code.toLowerCase();
    if (c.includes("hls") || c.includes("m3u8")) return "HLS 线路";
    if (c.includes("mp4")) return "MP4 线路";
    return "在线线路";
  }

  /** 静态：根据归一化结果构造跨 provider 的去重键 */
  static externalKeyOf(v: NormalizedVod): string {
    return buildExternalKey(v.title, v.year ?? undefined, v.category);
  }
}
