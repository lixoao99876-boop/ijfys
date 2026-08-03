"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addFavorite, checkFavorite, removeFavorite } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import Icon from "@/components/ui/Icon";

export default function FavoriteButton({ videoId }: { videoId: string }) {
  const { user, loaded, refresh } = useAuthStore();
  const [fav, setFav] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loaded) refresh(); }, [loaded, refresh]);
  useEffect(() => {
    if (!user) { setFav(null); return; }
    checkFavorite(videoId).then((r) => setFav(r.favorited)).catch(() => setFav(false));
  }, [user, videoId]);

  if (!user) {
    return (
      <Link
        href={`/login?next=/vod/${videoId}`}
        className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition inline-flex items-center gap-1.5"
      >
        <Icon name="star-outline" size={16} /> 登录后收藏
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (fav) {
        await removeFavorite(videoId);
        setFav(false);
      } else {
        await addFavorite(videoId);
        setFav(true);
      }
    } catch { /* noop */ }
    finally { setBusy(false); }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`px-5 py-2.5 rounded-full text-sm transition border inline-flex items-center gap-1.5 ${
        fav
          ? "bg-primary/20 border-primary/40 text-primary"
          : "bg-white/5 hover:bg-white/10 border-white/10"
      }`}
    >
      <Icon name={fav ? "star" : "plus"} size={16} />
      {fav ? "已收藏" : "收藏"}
    </button>
  );
}
