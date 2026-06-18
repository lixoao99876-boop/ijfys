/** 客户端 auth helper（cookie-based JWT，credentials: include） */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  nickname: string | null;
  avatar: string | null;
  role: string;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.message ?? msg;
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function register(body: { username: string; password: string; email?: string; nickname?: string }) {
  return api<{ token: string; user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function login(body: { usernameOrEmail: string; password: string }) {
  return api<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function logout() {
  return api<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export async function me(): Promise<AuthUser | null> {
  try {
    return await api<AuthUser | null>("/auth/me");
  } catch {
    return null;
  }
}

// ---------- favorites ----------

export function addFavorite(videoId: string) {
  return api<{ ok: boolean }>("/user/favorites", {
    method: "POST",
    body: JSON.stringify({ videoId }),
  });
}

export function removeFavorite(videoId: string) {
  return api<{ ok: boolean }>(`/user/favorites/${encodeURIComponent(videoId)}`, {
    method: "DELETE",
  });
}

export function checkFavorite(videoId: string) {
  return api<{ favorited: boolean }>(`/user/favorites/${encodeURIComponent(videoId)}/check`);
}

export function listFavorites(page = 1, limit = 24) {
  return api<{
    items: Array<{ videoId: string; createdAt: string; video: { id: string; title: string; cover: string | null; category: string; year: number | null; region: string | null; remarks: string | null; score: number } | null }>;
    page: number;
    limit: number;
    total: number;
  }>(`/user/favorites?page=${page}&limit=${limit}`);
}

// ---------- histories ----------

export function listHistories(page = 1, limit = 24) {
  return api<{
    items: Array<{ videoId: string; episodeId: string | null; episodeName: string | null; progress: number; duration: number; updatedAt: string; video: { id: string; title: string; cover: string | null; category: string; year: number | null } | null }>;
    page: number;
    limit: number;
    total: number;
  }>(`/user/histories?page=${page}&limit=${limit}`);
}

export function upsertHistory(data: { videoId: string; episodeId?: string; episodeName?: string; progress: number; duration: number }) {
  return api<{ ok: boolean }>("/user/histories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function mergeHistories(items: Array<{ videoId: string; episodeId?: string; episodeName?: string; progress: number; duration: number; updatedAt?: number }>) {
  return api<{ imported: number }>("/user/histories/merge", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

// ---------- ratings ----------

export function listMyRatings() {
  return api<Array<{ videoId: string; rating: number; comment: string | null; createdAt: string; video: { id: string; title: string; cover: string | null; category: string; year: number | null } | null }>>("/user/ratings");
}

export function rate(videoId: string, rating: number, comment?: string) {
  return api<{ ok: boolean }>("/user/ratings", {
    method: "POST",
    body: JSON.stringify({ videoId, rating, comment }),
  });
}

// ---------- comments ----------

export function listComments(videoId: string, page = 1, limit = 20) {
  return api<{
    items: Array<{ id: string; content: string; likes: number; parentId: string | null; createdAt: string; user: { id: string; username: string; nickname: string | null; avatar: string | null } }>;
    total: number;
    page: number;
    limit: number;
  }>(`/comments?videoId=${encodeURIComponent(videoId)}&page=${page}&limit=${limit}`);
}

export function postComment(videoId: string, content: string, parentId?: string) {
  return api<{ id: string; status: string }>("/comments", {
    method: "POST",
    body: JSON.stringify({ videoId, content, parentId }),
  });
}
