import { notFound } from "next/navigation";
import { fetchRecommendationsForVideo, getVideoById } from "@/lib/api";
import PlayClient from "./PlayClient";

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; episode: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { id, episode } = await params;
  const { source } = await searchParams;
  const video = await getVideoById(id);
  if (!video) notFound();
  const ep = video.episodes.find((e) => e.episodeId === episode);
  if (!ep) notFound();

  const rec = await fetchRecommendationsForVideo(id);
  const initialSourceId =
    (source && video.sources.find((s) => s.sourceId === source)?.sourceId) ?? video.sources[0]?.sourceId;

  return (
    <PlayClient
      video={video}
      initialEpisodeId={ep.episodeId}
      initialSourceId={initialSourceId}
      recommendations={rec.similar}
      byActor={rec.byActor}
      byDirector={rec.byDirector}
      byGenre={rec.byGenre}
    />
  );
}
