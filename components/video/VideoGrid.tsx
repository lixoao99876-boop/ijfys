import type { Video } from "@/lib/types";
import VideoCard from "./VideoCard";

export default function VideoGrid({ videos }: { videos: Video[] }) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-20 text-muted">
        <div className="text-5xl mb-3">🪐</div>
        <div className="text-sm">没有找到相关内容</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
