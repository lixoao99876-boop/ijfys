"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VideoPlayer from "@/components/player/VideoPlayer";
import EpisodeList from "@/components/video/EpisodeList";
import Icon from "@/components/ui/Icon";
import SourceTabs from "@/components/video/SourceTabs";
import SectionRow from "@/components/home/SectionRow";
import VideoCard from "@/components/video/VideoCard";
import { useHistoryStore } from "@/stores/historyStore";
import { usePlayerStore } from "@/stores/playerStore";
import { CATEGORY_LABEL, type Video } from "@/lib/types";
import { reportPlayFailure, reportPlaySuccess } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { upsertHistory as serverUpsertHistory } from "@/lib/auth";
import { formatEpisodeLabel } from "@/lib/episode-format";

interface Props {
  video: Video;
  initialEpisodeId: string;
  initialSourceId?: string;
  recommendations: Video[];
  byActor?: Video[];
  byDirector?: Video[];
  byGenre?: Video[];
}

export default function PlayClient({
  video,
  initialEpisodeId,
  initialSourceId,
  recommendations,
  byActor = [],
  byDirector = [],
  byGenre = [],
}: Props) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState(initialSourceId ?? video.sources[0].sourceId);
  const [episodeId, setEpisodeId] = useState(initialEpisodeId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const failedSources = usePlayerStore((s) => s.failedSources);
  const markSourceFailed = usePlayerStore((s) => s.markSourceFailed);
  const upsertHistory = useHistoryStore((s) => s.upsert);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setEpisodeId(initialEpisodeId);
  }, [initialEpisodeId]);

  const currentEpisode = useMemo(
    () => video.episodes.find((e) => e.episodeId === episodeId) ?? video.episodes[0],
    [video.episodes, episodeId],
  );

  const currentSource = useMemo(
    () => video.sources.find((s) => s.sourceId === sourceId) ?? video.sources[0],
    [video.sources, sourceId],
  );

  const playUrl = useMemo(() => {
    const match = currentSource.episodes.find((e) => e.episodeId === currentEpisode.episodeId);
    return match?.m3u8Url ?? currentSource.episodes[0]?.m3u8Url ?? "";
  }, [currentSource, currentEpisode]);

  const nextEpisode = useMemo(() => {
    const idx = video.episodes.findIndex((e) => e.episodeId === currentEpisode.episodeId);
    return idx >= 0 && idx < video.episodes.length - 1 ? video.episodes[idx + 1] : null;
  }, [video.episodes, currentEpisode]);

  const handleTimeUpdate = useCallback(
    (current: number, duration: number) => {
      upsertHistory({
        videoId: video.id,
        title: video.title,
        cover: video.cover,
        episodeId: currentEpisode.episodeId,
        episodeName: currentEpisode.name,
        episodeIndex: currentEpisode.index,
        sourceId: currentSource.sourceId,
        progress: current,
        duration,
        updatedAt: Date.now(),
      });
      // 登录态：节流写服务端（每 15 秒 / 切集 / 失败均不阻塞）
      if (user && Math.floor(current) % 15 === 0) {
        void serverUpsertHistory({
          videoId: video.id,
          episodeId: currentEpisode.episodeId,
          episodeName: currentEpisode.name,
          progress: Math.floor(current),
          duration: Math.floor(duration),
        }).catch(() => {});
      }
    },
    [video, currentEpisode, currentSource, upsertHistory, user],
  );

  const handleEnded = useCallback(() => {
    if (nextEpisode) {
      router.push(`/play/${video.id}/${nextEpisode.episodeId}?source=${encodeURIComponent(sourceId)}`);
    }
  }, [nextEpisode, router, video.id, sourceId]);

  const handleError = useCallback(
    (err: unknown) => {
      console.warn("[player] error", err);
      markSourceFailed(currentSource.sourceId);
      reportPlayFailure(currentSource.sourceId);
      // 自动切换到下一条未失败的线路（sources 已按 score 倒序）
      const failed = new Set(failedSources);
      failed.add(currentSource.sourceId);
      const next = video.sources.find((s) => !failed.has(s.sourceId));
      if (next && next.sourceId !== currentSource.sourceId) {
        setSourceId(next.sourceId);
        setErrorMsg(`线路 ${currentSource.sourceName} 失败，已自动切换到 ${next.sourceName}`);
      } else {
        setErrorMsg(`所有线路均失败（${video.sources.length} 条），请稍后重试或选择其他剧集`);
      }
    },
    [currentSource, markSourceFailed, failedSources, video.sources],
  );

  const handleReady = useCallback(
    (firstFrameMs: number) => {
      reportPlaySuccess(currentSource.sourceId, firstFrameMs);
    },
    [currentSource],
  );

  function switchSource(id: string) {
    setErrorMsg(null);
    setSourceId(id);
    router.replace(`/play/${video.id}/${currentEpisode.episodeId}?source=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Left: Player + Info */}
      <div>
        <VideoPlayer
          url={playUrl}
          poster={video.backdrop}
          title={`${video.title} · ${currentEpisode.name}`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          onReady={handleReady}
        />

        {errorMsg && (
          <div className="mt-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Icon name="warning" size={15} /> {errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs text-muted hover:text-text"
            >
              关闭
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/vod/${video.id}`}
            className="text-xl font-bold hover:text-accent transition"
          >
            {video.title}
          </Link>
          <span className="text-xs text-muted">
            {CATEGORY_LABEL[video.category]} · {video.year} · {video.region}
          </span>
          <span className="ml-auto flex gap-2">
            {nextEpisode && (
              <Link
                href={`/play/${video.id}/${nextEpisode.episodeId}?source=${encodeURIComponent(sourceId)}`}
                className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition inline-flex items-center gap-1"
              >
                下一集 <Icon name="arrow-right" size={14} />
              </Link>
            )}
          </span>
        </div>

        <div className="mt-2 text-sm text-muted">
          正在播放：<span className="text-text">{formatEpisodeLabel(currentEpisode, video.category)}</span> · 线路
          <span className="text-text"> {currentSource.sourceName}</span>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-4 bg-primary rounded-full" />
            <h3 className="text-sm font-bold">播放线路</h3>
          </div>
          <SourceTabs
            sources={video.sources}
            currentSourceId={currentSource.sourceId}
            failedSources={failedSources}
            onChange={switchSource}
          />
        </div>

        {/* Episode grid (mobile + tablet) */}
        <div className="mt-6 lg:hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 bg-primary rounded-full" />
            <h3 className="text-sm font-bold">剧集列表</h3>
          </div>
          <EpisodeList
            videoId={video.id}
            episodes={video.episodes}
            currentEpisodeId={currentEpisode.episodeId}
            category={video.category}
            sourceId={currentSource.sourceId}
          />
        </div>

        <div className="mt-10 space-y-8">
          {byActor.length > 0 && (
            <SectionRow title={`同演员：${(video.actors ?? []).slice(0, 2).join("、")} 的作品`} videos={byActor} />
          )}
          {byDirector.length > 0 && video.director && (
            <SectionRow title={`同导演：${video.director}`} videos={byDirector} />
          )}
          {byGenre.length > 0 && (
            <SectionRow title="同类型" videos={byGenre} />
          )}
          {recommendations.length > 0 && (
            <SectionRow title="猜你喜欢" videos={recommendations} />
          )}
        </div>
      </div>

      {/* Right: Episode list (desktop) + small recommendations */}
      <aside className="hidden lg:block space-y-6">
        <div className="bg-surface/40 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">剧集列表</h3>
            <span className="text-xs text-muted">共 {video.episodes.length} 集</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto pr-1">
            <EpisodeList
              videoId={video.id}
              episodes={video.episodes}
              currentEpisodeId={currentEpisode.episodeId}
              compact
              category={video.category}
              sourceId={currentSource.sourceId}
            />
          </div>
        </div>

        <div className="bg-surface/40 rounded-xl p-4 border border-white/5">
          <h3 className="text-sm font-bold mb-3">为你推荐</h3>
          <div className="grid grid-cols-2 gap-3">
            {recommendations.slice(0, 6).map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
