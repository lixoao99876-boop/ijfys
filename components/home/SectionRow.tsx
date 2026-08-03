import Link from "next/link";
import type { Video } from "@/lib/types";
import VideoCard from "@/components/video/VideoCard";
import Icon from "@/components/ui/Icon";

interface Props {
  title: string;
  videos: Video[];
  moreHref?: string;
}

export default function SectionRow({ title, videos, moreHref }: Props) {
  if (videos.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-4">
        <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full" />
          {title}
        </h3>
        {moreHref && (
          <Link href={moreHref} className="text-xs text-muted hover:text-accent transition inline-flex items-center gap-1">
            更多 <Icon name="arrow-right" size={13} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </section>
  );
}
