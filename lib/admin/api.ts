/** Admin 后台调用 NestJS /api/admin/* 的瘦客户端（server component 用） */

const ADMIN_BASE =
  (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api") + "/admin";

async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${ADMIN_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`admin ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export interface AdminStats {
  counters: {
    videos: number;
    actors: number;
    articles: number;
    sources: number;
    providers: number;
    pv: number | null;
    uv: number | null;
    ip: number | null;
    dau: number | null;
  };
  lastSync: { video: string | null; actor: string | null; article: string | null };
  recentSyncs: Array<{
    id: string;
    provider: string;
    providerName: string;
    entity: "VIDEO" | "ACTOR" | "ARTICLE";
    type: "FULL" | "INCREMENTAL" | "MANUAL";
    status: "RUNNING" | "SUCCESS" | "FAILED";
    startedAt: string;
    durationMs: number | null;
    itemsSeen: number;
    videosAdded: number;
    actorsAdded: number;
    articlesAdded: number;
  }>;
}

export type VideoStatus = "PUBLISHED" | "UNPUBLISHED" | "DELETED";
export type ProviderStatusValue = "ACTIVE" | "PAUSED" | "DISABLED";

export interface AdminVideoRow {
  id: string;
  title: string;
  originalTitle: string | null;
  category: string;
  region: string | null;
  year: number | null;
  cover: string | null;
  remarks: string | null;
  score: number;
  status: VideoStatus;
  playCount: number;
  sources: number;
  episodes: number;
  sourceUpdatedAt: string | null;
  updatedAt: string;
}

export interface AdminActorRow {
  id: string;
  name: string;
  alias: string | null;
  sex: string | null;
  area: string | null;
  birthday: string | null;
  cover: string | null;
  works: string | null;
  providerCode: string | null;
  sourceUpdatedAt: string | null;
}

export interface AdminArticleRow {
  id: string;
  title: string;
  typeName: string | null;
  author: string | null;
  fromSite: string | null;
  cover: string | null;
  score: number;
  hits: number;
  providerCode: string | null;
  sourceUpdatedAt: string | null;
}

export interface AdminProviderRow {
  id: number;
  code: string;
  name: string;
  baseUrl: string;
  status: ProviderStatusValue;
  weight: number;
  sources: number;
  syncSuccessRate: number | null;
  playSuccessRate: number | null;
  playSuccessCount: number;
  playFailCount: number;
  avgResponseTimeMs: number | null;
  lastSyncAt: string | null;
  lastDurationMs: number | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

export interface AdminLogRow {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AdminRankings {
  providersByRate: Array<{ code: string; name: string; successRate: number | null; total: number }>;
  popularVideos: Array<{
    rank: number;
    id: string;
    title: string;
    category: string;
    cover: string | null;
    playCount: number;
    score: number;
  }>;
  popularSearches: Array<{ rank: number; keyword: string; hits: number; lastSearchedAt: string }>;
}

export interface AdminSourceRow {
  id: string;
  videoId: string;
  videoTitle: string;
  videoCover: string | null;
  provider: string;
  providerName: string;
  playFromCode: string;
  sourceName: string;
  lineName: string;
  quality: string;
  totalEpisodes: number;
  score: number;
  isActive: boolean;
  failureCount: number;
  updatedAt: string;
}

export interface AdminSyncLogRow {
  id: string;
  provider: string;
  providerName: string;
  entity: "VIDEO" | "ACTOR" | "ARTICLE";
  type: "FULL" | "INCREMENTAL" | "MANUAL";
  status: "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  pagesFetched: number;
  itemsSeen: number;
  videosAdded: number;
  actorsAdded: number;
  articlesAdded: number;
  errorMessage: string | null;
}

export interface AdminPopularRow {
  rank: number;
  id: string;
  title: string;
  category: string;
  region: string | null;
  year: number | null;
  cover: string | null;
  score: number;
  remarks: string | null;
  sources: number;
  sourceUpdatedAt: string | null;
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function fetchStats() {
  return adminFetch<AdminStats>("/stats");
}

export function fetchVideos(q: Record<string, string | number | undefined>) {
  return adminFetch<Paged<AdminVideoRow>>(`/videos${queryString(q)}`);
}

export function fetchActors(q: Record<string, string | number | undefined>) {
  return adminFetch<Paged<AdminActorRow>>(`/actors${queryString(q)}`);
}

export function fetchArticles(q: Record<string, string | number | undefined>) {
  return adminFetch<Paged<AdminArticleRow>>(`/articles${queryString(q)}`);
}

export function fetchProviders() {
  return adminFetch<AdminProviderRow[]>("/providers");
}

export function fetchSources(q: Record<string, string | number | undefined>) {
  return adminFetch<Paged<AdminSourceRow>>(`/sources${queryString(q)}`);
}

export function fetchSyncLogs(q: Record<string, string | number | undefined>) {
  return adminFetch<Paged<AdminSyncLogRow>>(`/sync-logs${queryString(q)}`);
}

export function fetchPopular(q: Record<string, string | number | undefined>) {
  return adminFetch<AdminPopularRow[]>(`/popular${queryString(q)}`);
}

export function fetchAdminLogs(q: Record<string, string | number | undefined>) {
  return adminFetch<Paged<AdminLogRow>>(`/admin-logs${queryString(q)}`);
}

export function fetchRankings(limit?: number) {
  return adminFetch<AdminRankings>(limit ? `/rankings?limit=${limit}` : "/rankings");
}

// ---------- 写操作（client component 用）----------

async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`admin ${path} → ${res.status}`);
  return (await res.json()) as T;
}

async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`admin ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export function triggerProviderSync(code: string, type: "full" | "incremental" = "incremental") {
  return adminPost<{ accepted: boolean }>(`/providers/${encodeURIComponent(code)}/sync`, { type });
}

export function setProviderStatus(code: string, status: ProviderStatusValue) {
  return adminPost<{ ok: boolean }>(`/providers/${encodeURIComponent(code)}/status`, { status });
}

export function setVideoStatus(id: string, status: VideoStatus) {
  return adminPatch<{ ok: boolean }>(`/videos/${encodeURIComponent(id)}`, { status });
}

export function editVideo(
  id: string,
  data: {
    title?: string;
    originalTitle?: string | null;
    year?: number | null;
    region?: string | null;
    remarks?: string | null;
    description?: string | null;
  },
) {
  return adminPatch<{ ok: boolean }>(`/videos/${encodeURIComponent(id)}`, data);
}

export function bulkVideoStatus(ids: string[], status: VideoStatus) {
  return adminPost<{ updated: number }>("/videos/bulk-status", { ids, status });
}

// ---------- 首页配置 ----------

export interface AdminHomeChannel {
  code: string;
  title: string;
  kind: "BANNER" | "CUSTOM";
  categoryFilter: string | null;
  order: number;
  itemLimit: number;
  fillFromDb: boolean;
  enabled: boolean;
  items: Array<{
    id: string;
    videoId: string;
    order: number;
    video: { id: string; title: string; cover: string | null; category: string; year: number | null; status: VideoStatus } | null;
  }>;
}

export function fetchHomeConfig() {
  return adminFetch<AdminHomeChannel[]>("/home-config");
}

export function patchHomeChannel(
  code: string,
  data: Partial<{ title: string; categoryFilter: string | null; order: number; itemLimit: number; fillFromDb: boolean; enabled: boolean }>,
) {
  return adminPatch<{ ok: boolean }>(`/home-config/channels/${encodeURIComponent(code)}`, data);
}

export function addHomeChannelItem(code: string, videoId: string) {
  return adminPost<{ ok: boolean }>(`/home-config/channels/${encodeURIComponent(code)}/items`, { videoId });
}

export function removeHomeChannelItem(code: string, videoId: string) {
  return adminPost<{ ok: boolean }>(`/home-config/channels/${encodeURIComponent(code)}/items/${encodeURIComponent(videoId)}/delete`);
}

export function reorderHomeChannelItems(code: string, videoIds: string[]) {
  return adminPost<{ ok: boolean }>(`/home-config/channels/${encodeURIComponent(code)}/reorder`, { videoIds });
}

export function reorderHomeChannels(codes: string[]) {
  return adminPost<{ ok: boolean }>("/home-config/channels/reorder", { codes });
}

// ---------- 仪表盘扩展 ----------

export interface PopularActor {
  rank: number;
  name: string;
  works: number;
  actor: { id: string; cover: string | null; area: string | null; birthday: string | null } | null;
}

export function fetchPopularActors(limit = 100) {
  return adminFetch<PopularActor[]>(`/popular-actors?limit=${limit}`);
}

export interface DailyStatRow {
  date: string;
  pv: number;
  uv: number;
  ip: number;
  dau: number;
  playCount: number;
  searches: number;
}

export function fetchDailyStats(days = 7) {
  return adminFetch<{ days: DailyStatRow[] }>(`/daily-stats?days=${days}`);
}

// ---------- 专题合集 ----------

export interface AdminCollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  enabled: boolean;
  itemCount: number;
  updatedAt: string;
}

export interface AdminCollectionDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  enabled: boolean;
  items: Array<{
    id: string;
    videoId: string;
    order: number;
    video: { id: string; title: string; cover: string | null; category: string; year: number | null; status: VideoStatus } | null;
  }>;
}

export function fetchCollections() {
  return adminFetch<AdminCollectionRow[]>("/collections");
}

export function fetchCollectionDetail(id: string) {
  return adminFetch<AdminCollectionDetail>(`/collections/${id}`);
}

export function createCollection(body: { slug: string; title: string; description?: string; cover?: string }) {
  return adminPost<{ id: string }>("/collections", body);
}

export function updateCollection(id: string, body: { slug?: string; title?: string; description?: string | null; cover?: string | null; enabled?: boolean }) {
  return adminPatch<{ ok: boolean }>(`/collections/${id}`, body);
}

export function deleteCollection(id: string) {
  return adminPost<{ ok: boolean }>(`/collections/${id}/delete`);
}

export function addCollectionItem(id: string, videoId: string) {
  return adminPost<{ ok: boolean }>(`/collections/${id}/items`, { videoId });
}

export function removeCollectionItem(id: string, videoId: string) {
  return adminPost<{ ok: boolean }>(`/collections/${id}/items/${encodeURIComponent(videoId)}/delete`);
}

export function reorderCollectionItems(id: string, videoIds: string[]) {
  return adminPost<{ ok: boolean }>(`/collections/${id}/reorder`, { videoIds });
}

// ---------- 评论审核 ----------
export interface AdminCommentRow {
  id: string;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  videoId: string | null;
  articleId: string | null;
  parentId: string | null;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  isDeleted: boolean;
  user: { id: string; username: string; nickname: string | null };
}

export function fetchAdminComments(params: { status?: string; q?: string; page?: number; limit?: number }) {
  const usp = new URLSearchParams();
  if (params.status) usp.set("status", params.status);
  if (params.q) usp.set("q", params.q);
  if (params.page) usp.set("page", String(params.page));
  if (params.limit) usp.set("limit", String(params.limit));
  return adminFetch<Paged<AdminCommentRow>>(`/comments?${usp.toString()}`);
}

export function approveComment(id: string) {
  return adminPost<{ ok: boolean }>(`/comments/${id}/approve`);
}

export function rejectComment(id: string, reason?: string) {
  return adminPost<{ ok: boolean }>(`/comments/${id}/reject`, { reason });
}

export function bulkModerateComments(ids: string[], action: "approve" | "reject", reason?: string) {
  return adminPost<{ updated: number }>("/comments/bulk-moderate", { ids, action, reason });
}

export function deleteCommentAdmin(id: string) {
  return adminPost<{ ok: boolean }>(`/comments/${id}/delete`);
}

// ---------- 搜索索引 ----------
export function fetchSearchStats() {
  return adminFetch<{ available: boolean; count: number; isIndexing?: boolean }>("/search/stats");
}

export function triggerReindex() {
  return adminPost<{ indexed: number }>("/search/reindex");
}

function queryString(q: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === "") continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}
