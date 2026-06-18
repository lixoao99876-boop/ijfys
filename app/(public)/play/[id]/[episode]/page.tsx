import { notFound } from "next/navigation";
import { fetchRecommendationsForVideo, getVideoById } from "@/lib/api";
import PlayClient from "./PlayClient";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string; episode: string }>;
}) {
  const { id, episode } = await params;
  const video = await getVideoById(id);
  if (!video) notFound();
  const ep = video.episodes.find((e) => e.episodeId === episode);
  if (!ep) notFound();

  const rec = await fetchRecommendationsForVideo(id);

  return (
    <PlayClient
      video={video}
      initialEpisodeId={ep.episodeId}
      recommendations={rec.similar}
      byActor={rec.byActor}
      byDirector={rec.byDirector}
      byGenre={rec.byGenre}
    />
  );
}
