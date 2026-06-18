"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listFavorites, listHistories, listMyRatings, logout } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

type Tab = "favorites" | "histories" | "ratings";

export default function MePage() {
  const router = useRouter();
  const { user, loaded, refresh, setUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>("favorites");

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (loaded && !user) router.replace("/login?next=/me");
  }, [loaded, user, router]);

  if (!loaded || !user) {
    return <div className="text-center text-muted py-20 text-sm">加载中...</div>;
  }

  async function handleLogout() {
    try {
      await logout();
    } catch { /* noop */ }
    setUser(null);
    router.push("/");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
            {(user.nickname ?? user.username).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-semibold">{user.nickname ?? user.username}</div>
            <div className="text-xs text-muted">@{user.username} · {user.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="px-3 h-8 rounded-md border border-white/10 text-sm text-muted hover:text-text hover:border-white/30">
          退出登录
        </button>
      </div>

      <div className="flex items-center gap-1 text-sm mb-4">
        <TabBtn active={tab === "favorites"} onClick={() => setTab("favorites")}>我的收藏</TabBtn>
        <TabBtn active={tab === "histories"} onClick={() => setTab("histories")}>观看历史</TabBtn>
        <TabBtn active={tab === "ratings"} onClick={() => setTab("ratings")}>我的评分</TabBtn>
      </div>

      {tab === "favorites" && <FavoritesPanel />}
      {tab === "histories" && <HistoriesPanel />}
      {tab === "ratings" && <RatingsPanel />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md border transition ${
        active ? "bg-white/[0.06] border-white/20 text-text" : "border-transparent text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function FavoritesPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listFavorites>> | null>(null);
  useEffect(() => {
    listFavorites().then(setData).catch(() => setData({ items: [], page: 1, limit: 24, total: 0 }));
  }, []);
  if (!data) return <Loading />;
  if (data.items.length === 0) return <Empty msg="还没有收藏，去首页看看吧" />;
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {data.items.map((it) =>
        it.video ? (
          <Link key={it.videoId} href={`/vod/${it.videoId}`} className="group">
            <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/5 bg-surface2">
              {it.video.cover && <img src={it.video.cover} alt={it.video.title} className="w-full h-full object-cover" />}
            </div>
            <div className="text-sm text-text mt-2 line-clamp-1 group-hover:text-primary">{it.video.title}</div>
            <div className="text-[10px] text-muted">{it.video.region} · {it.video.year}</div>
          </Link>
        ) : null,
      )}
    </div>
  );
}

function HistoriesPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listHistories>> | null>(null);
  useEffect(() => {
    listHistories().then(setData).catch(() => setData({ items: [], page: 1, limit: 24, total: 0 }));
  }, []);
  if (!data) return <Loading />;
  if (data.items.length === 0) return <Empty msg="还没有观看历史" />;
  return (
    <ul className="space-y-2">
      {data.items.map((it) =>
        it.video ? (
          <li key={it.videoId}>
            <Link href={`/play/${it.videoId}/${it.episodeId ?? ""}`} className="flex gap-3 p-2 rounded hover:bg-white/[0.03]">
              {it.video.cover && <img src={it.video.cover} alt="" className="w-20 h-28 object-cover rounded shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text line-clamp-1">{it.video.title}</div>
                <div className="text-xs text-muted mt-0.5">{it.episodeName ?? "—"}</div>
                {it.duration > 0 && (
                  <div className="mt-2 text-[10px] text-muted">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-0.5 max-w-xs">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.round((it.progress / it.duration) * 100))}%` }} />
                    </div>
                    {Math.round((it.progress / it.duration) * 100)}% · {new Date(it.updatedAt).toLocaleDateString("zh-CN")}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ) : null,
      )}
    </ul>
  );
}

function RatingsPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listMyRatings>> | null>(null);
  useEffect(() => {
    listMyRatings().then(setData).catch(() => setData([]));
  }, []);
  if (!data) return <Loading />;
  if (data.length === 0) return <Empty msg="还没有评分" />;
  return (
    <ul className="space-y-2">
      {data.map((r) => (
        <li key={r.videoId} className="flex gap-3 p-3 rounded bg-surface/40 border border-white/5">
          {r.video?.cover && <img src={r.video.cover} alt="" className="w-16 h-22 object-cover rounded shrink-0" />}
          <div className="flex-1 min-w-0">
            <Link href={`/vod/${r.videoId}`} className="text-sm font-medium text-text hover:text-primary">
              {r.video?.title ?? "(已下架)"}
            </Link>
            <div className="text-xs text-muted mt-1">
              <span className="text-primary font-medium">{r.rating}/10</span>
              <span className="ml-2">{new Date(r.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>
            {r.comment && <div className="text-sm text-muted mt-2 whitespace-pre-wrap">{r.comment}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Loading() {
  return <div className="text-center text-muted py-12 text-sm">加载中...</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className="text-center text-muted py-20 text-sm">{msg}</div>;
}
