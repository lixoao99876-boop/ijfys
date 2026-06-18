import axios, { AxiosInstance } from "axios";
import { Logger } from "@nestjs/common";
import type { AppleCmsListResponse, FetchListOptions } from "./apple-cms.types";

/**
 * 苹果 CMS V10 客户端
 *
 * - 支持多 baseUrl 兜底：主域名挂掉时按顺序尝试备用域名
 * - 同一个 client 实例会"粘住"最近一次成功的域名 index，下一次请求优先用它
 * - 路径段（/vod、/actor、/art）由 segment 控制，所有 baseUrl 共用同一 segment 替换规则
 *
 * baseUrls 输入要求：每一条都形如 `https://host/api.php/provide/vod`，
 * 客户端会按 segment="actor"/"art" 自动替换尾段。
 */
export type CmsSegment = "vod" | "actor" | "art";

export class AppleCmsClient {
  private readonly http: AxiosInstance;
  private readonly baseUrls: string[];
  private readonly logger = new Logger(AppleCmsClient.name);
  private lastWorkingIdx = 0;

  constructor(
    baseUrl: string | string[],
    options: { timeoutMs?: number; userAgent?: string } = {},
  ) {
    const arr = Array.isArray(baseUrl) ? baseUrl : [baseUrl];
    this.baseUrls = arr.map((u) => u.replace(/\/+$/, "")).filter(Boolean);
    if (this.baseUrls.length === 0) throw new Error("AppleCmsClient: baseUrl 为空");
    this.http = axios.create({
      timeout: options.timeoutMs ?? 15000,
      headers: { "User-Agent": options.userAgent ?? "ijfys-crawler/0.1" },
    });
  }

  /** 主域名（首选） */
  get primaryUrl(): string {
    return this.baseUrls[this.lastWorkingIdx] ?? this.baseUrls[0];
  }

  /** 视频列表（detail 模式） */
  fetchDetailPage(opts: FetchListOptions = {}): Promise<AppleCmsListResponse> {
    const params: Record<string, string | number> = { ac: "detail" };
    if (opts.page) params.pg = opts.page;
    if (opts.hours) params.h = opts.hours;
    if (opts.typeId) params.t = opts.typeId;
    if (opts.ids && opts.ids.length) params.ids = opts.ids.join(",");
    return this.request("vod", params);
  }

  /** 演员列表（detail：富字段） */
  fetchActorPage(opts: FetchListOptions = {}): Promise<AppleCmsListResponse> {
    const params: Record<string, string | number> = { ac: "detail" };
    if (opts.page) params.pg = opts.page;
    if (opts.hours) params.h = opts.hours;
    return this.request("actor", params);
  }

  /** 资讯列表（detail：含 art_content） */
  fetchArticlePage(opts: FetchListOptions = {}): Promise<AppleCmsListResponse> {
    const params: Record<string, string | number> = { ac: "detail" };
    if (opts.page) params.pg = opts.page;
    if (opts.hours) params.h = opts.hours;
    return this.request("art", params);
  }

  /** 探活：任意一个域名 + segment 通过即算活 */
  async ping(segment: CmsSegment = "vod"): Promise<boolean> {
    try {
      const r = await this.request(segment, { ac: "list", pg: 1 });
      return r.code === 1 || (Array.isArray(r.list) && r.list.length >= 0);
    } catch {
      return false;
    }
  }

  /**
   * 内部统一请求：按 baseUrls 顺序尝试，从 lastWorkingIdx 开始。
   * 任意一个成功就返回，并把成功 idx 记住；全部失败抛最后一个错误。
   */
  private async request(
    segment: CmsSegment,
    params: Record<string, string | number>,
  ): Promise<AppleCmsListResponse> {
    const order = this.tryOrder();
    let lastErr: unknown;
    for (const idx of order) {
      const url = this.buildUrl(this.baseUrls[idx], segment);
      try {
        const { data } = await this.http.get<AppleCmsListResponse>(url, { params });
        if (!data || typeof data !== "object" || !Array.isArray(data.list)) {
          throw new Error(`返回结构异常 @ ${url}`);
        }
        if (idx !== this.lastWorkingIdx) {
          this.logger.warn(`切换主域名: ${this.baseUrls[this.lastWorkingIdx]} → ${this.baseUrls[idx]}`);
          this.lastWorkingIdx = idx;
        }
        return data;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`域名失败 ${url}: ${msg}`);
      }
    }
    throw lastErr ?? new Error("所有备用域名均失败");
  }

  /** 从 lastWorkingIdx 起循环遍历的尝试顺序 */
  private tryOrder(): number[] {
    const n = this.baseUrls.length;
    return Array.from({ length: n }, (_, i) => (this.lastWorkingIdx + i) % n);
  }

  /** vod baseUrl → actor / art URL 派生（替换尾段） */
  private buildUrl(base: string, segment: CmsSegment): string {
    if (segment === "vod") return base;
    return base.replace(/\/vod(\/?)$/, `/${segment}$1`);
  }
}
