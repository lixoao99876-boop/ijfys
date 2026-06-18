"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { Video } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/types";

export default function HeroBanner({ videos }: { videos: Video[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (videos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % videos.length), 6000);
    return () => clearInterval(t);
  }, [videos.length]);

  if (videos.length === 0) return null;
  const v = videos[idx];

  return (
    <div className="relative h-[280px] sm:h-[360px] md:h-[440px] rounded-2xl overflow-hidden ring-1 ring-white/5 mb-8">
      {videos.map((video, i) => (
        <Image
          key={video.id}
          src={video.backdrop}
          alt={video.title}
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-1000 ${i === idx ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

      <div className="relative h-full flex flex-col justify-end p-6 md:p-10 max-w-2xl">
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="px-2 py-0.5 rounded bg-primary/90 font-semibold">推荐</span>
          <span className="text-muted">{CATEGORY_LABEL[v.category]}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{v.year}</span>
          <span className="text-muted">·</span>
          <span className="text-accent font-semibold">{v.score.toFixed(1)} 分</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-bold mb-3">{v.title}</h2>
        <p className="text-sm text-muted line-clamp-2 mb-5">{v.description}</p>
        <div className="flex items-center gap-3">
          <Link
            href={`/play/${v.id}/${v.episodes[0].episodeId}`}
            className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary/80 text-sm font-semibold flex items-center gap-2 shadow-glow transition"
          >
            ▶ 立即播放
          </Link>
          <Link
            href={`/vod/${v.id}`}
            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-sm font-medium transition"
          >
            详情
          </Link>
        </div>

        {videos.length > 1 && (
          <div className="flex gap-1.5 mt-6">
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`switch to ${i + 1}`}
                className={`h-1 rounded-full transition-all ${
                  i === idx ? "w-8 bg-primary" : "w-4 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
