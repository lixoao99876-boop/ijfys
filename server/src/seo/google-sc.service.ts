import { Injectable, Logger } from "@nestjs/common";

/**
 * Google Search Console（OAuth refresh_token 路径，迁写自 aiskill88 sc-deep.js）
 * Google 不再接受单 URL 主动提交（Indexing API 仅限 JobPosting）；
 * 收录入口 = sitemap 提交（SC API PUT）+ 已废弃但无害的 ping。
 */
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SC_API = "https://www.googleapis.com/webmasters/v3";
const TIMEOUT_MS = 30_000;

interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

@Injectable()
export class GoogleScService {
  private readonly logger = new Logger(GoogleScService.name);
  private accessToken: { token: string; expiresAt: number } | null = null;

  private get siteUrl(): string {
    return process.env.SC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? "https://aiskill88.xyz";
  }

  get enabled(): boolean {
    return !!(
      process.env.GA4_OAUTH_CLIENT_ID &&
      process.env.GA4_OAUTH_CLIENT_SECRET &&
      process.env.GA4_OAUTH_REFRESH_TOKEN
    );
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.accessToken.expiresAt - 60_000) return this.accessToken.token;
    if (!this.enabled) return null;
    try {
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GA4_OAUTH_CLIENT_ID!,
          client_secret: process.env.GA4_OAUTH_CLIENT_SECRET!,
          refresh_token: process.env.GA4_OAUTH_REFRESH_TOKEN!,
          grant_type: "refresh_token",
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(`SC token refresh failed: HTTP ${res.status}`);
        return null;
      }
      const j = (await res.json()) as { access_token: string; expires_in: number };
      this.accessToken = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
      return j.access_token;
    } catch (e) {
      this.logger.warn(`SC token refresh error: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  private async api<T = unknown>(
    method: "GET" | "PUT" | "POST",
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: T | null }> {
    const token = await this.getAccessToken();
    if (!token) return { status: 401, json: null };
    const res = await fetch(`${SC_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    let json: T | null = null;
    try {
      json = (await res.json()) as T;
    } catch {
      /* PUT sitemap 成功时无 body */
    }
    return { status: res.status, json };
  }

  /** SC API 登记/重提交 sitemap（PUT 幂等，触发 Google 重新抓取） */
  async submitSitemap(sitemapUrl?: string): Promise<{ ok: boolean; status: number }> {
    const target = sitemapUrl ?? `${this.siteUrl.replace(/\/+$/, "")}/sitemap.xml`;
    const path = `/sites/${encodeURIComponent(this.siteUrl)}/sitemaps/${encodeURIComponent(target)}`;
    const r = await this.api("PUT", path);
    this.logger.log(`SC sitemap PUT → HTTP ${r.status}`);
    return { ok: r.status === 200 || r.status === 204, status: r.status };
  }

  async getSitemapStatus(sitemapUrl?: string): Promise<unknown> {
    const target = sitemapUrl ?? `${this.siteUrl.replace(/\/+$/, "")}/sitemap.xml`;
    const r = await this.api("GET", `/sites/${encodeURIComponent(this.siteUrl)}/sitemaps/${encodeURIComponent(target)}`);
    return { status: r.status, sitemap: r.json };
  }

  /** 已废弃的 ping：无害尝试，非 200 只记日志 */
  async pingSitemap(): Promise<{ status: number }> {
    const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(`${this.siteUrl.replace(/\/+$/, "")}/sitemap.xml`)}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      return { status: res.status };
    } catch {
      return { status: 0 };
    }
  }

  // ---------- GSC 数据读取（sc-deep 迁移） ----------

  async searchAnalytics(body: Record<string, unknown>): Promise<SearchAnalyticsRow[]> {
    const r = await this.api<{ rows?: SearchAnalyticsRow[] }>(
      "POST",
      `/sites/${encodeURIComponent(this.siteUrl)}/searchAnalytics/query`,
      body,
    );
    return r.json?.rows ?? [];
  }

  private dateRange(days: number, offset = 0): { startDate: string; endDate: string } {
    const end = new Date(Date.now() - (3 + offset) * 86400_000); // GSC 数据延迟 ~3 天
    const start = new Date(end.getTime() - days * 86400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { startDate: fmt(start), endDate: fmt(end) };
  }

  /** 机会关键词：排名 8-25、有曝光，推一把就能进前页 */
  async getOpportunityKeywords(limit = 20): Promise<SearchAnalyticsRow[]> {
    const rows = await this.searchAnalytics({
      ...this.dateRange(28),
      dimensions: ["query"],
      rowLimit: 500,
    });
    return rows
      .filter((r) => r.position >= 8 && r.position <= 25 && r.impressions >= 10)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, limit);
  }

  /** 高曝光低点击页面 */
  async getLowCtrPages(limit = 20): Promise<SearchAnalyticsRow[]> {
    const rows = await this.searchAnalytics({
      ...this.dateRange(28),
      dimensions: ["page"],
      rowLimit: 500,
    });
    return rows
      .filter((r) => r.impressions >= 50 && r.ctr < 0.02)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, limit);
  }

  /** 排名下滑页面：近 7 天 vs 前 7 天 position 恶化 > 3 */
  async getRankDropPages(limit = 20): Promise<Array<{ page: string; prev: number; curr: number; delta: number }>> {
    const [curr, prev] = await Promise.all([
      this.searchAnalytics({ ...this.dateRange(7), dimensions: ["page"], rowLimit: 500 }),
      this.searchAnalytics({ ...this.dateRange(7, 7), dimensions: ["page"], rowLimit: 500 }),
    ]);
    const prevMap = new Map(prev.map((r) => [r.keys[0], r.position]));
    return curr
      .map((r) => {
        const p = prevMap.get(r.keys[0]);
        return p != null ? { page: r.keys[0], prev: p, curr: r.position, delta: r.position - p } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x && x.delta > 3)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, limit);
  }
}
