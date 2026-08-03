import Link from "next/link";
import Image from "next/image";
import { CATEGORY_LABEL, type Video } from "@/lib/types";
import { formatRemarks } from "@/lib/episode-format";
import Icon from "@/components/ui/Icon";

export default function VideoCard({ video }: { video: Video }) {
  const badge = formatRemarks(video.remarks, video.updatedAt, video.category);
  return (
    <Link
      href={`/vod/${video.id}`}
      className="group block w-full transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface2 ring-1 ring-white/5 group-hover:ring-accent/40 transition shadow-lg">
        <Image
          src={video.cover}
          alt={`${video.title}-${CATEGORY_LABEL[video.category] ?? "影视"}封面`}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 200px"
          className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
        />
        {badge && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 text-[11px] rounded bg-black/60 backdrop-blur-sm">
            {badge}
          </div>
        )}
        {video.score > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[11px] rounded bg-black/60 backdrop-blur-sm font-semibold flex items-center gap-0.5">
            <span className="text-yellow-400 flex items-center"><Icon name="star" size={12} /></span>
            <span>{video.score.toFixed(1)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <span className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-white shadow-glow pl-0.5">
            <Icon name="play" size={20} />
          </span>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <div className="text-sm font-medium truncate group-hover:text-accent transition">
          {video.title}
        </div>
        <div className="text-xs text-muted truncate">
          {video.year} · {video.region} · {video.genres.slice(0, 2).join("/")}
        </div>
      </div>
    </Link>
  );
}
