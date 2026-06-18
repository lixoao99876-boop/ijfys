import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import EpisodeList from "@/components/video/EpisodeList";
import SectionRow from "@/components/home/SectionRow";
import FavoriteButton from "@/components/video/FavoriteButton";
import CommentSection from "@/components/video/CommentSection";
import { CATEGORY_LABEL } from "@/lib/types";
import { getRecommendations, getVideoById } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideoById(id);
  if (!video) return { title: "影片不存在 - 飓风影视" };
  const cat = CATEGORY_LABEL[video.category] ?? "影视";
  const desc =
    (video.description ?? `${cat}《${video.title}》${video.year} ${video.region} ${video.remarks ?? ""} 在线观看`)
      .replace(/\s+/g, " ")
      .slice(0, 160);
  return {
    title: `${video.title} - ${cat}在线观看 - 飓风影视`,
    description: desc,
    keywords: [
      video.title,
      video.originalTitle,
      cat,
      video.region,
      String(video.year),
      ...(video.genres ?? []),
      ...(video.actors ?? []).slice(0, 5),
      video.director,
    ].filter(Boolean).join(", "),
    openGraph: {
      title: `${video.title} - ${cat}在线观看`,
      description: desc,
      images: [video.cover, video.backdrop].filter(Boolean) as string[],
      type: "video.other",
    },
  };
}

export default async function VodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideoById(id);
  if (!video) notFound();

  const recommendations = await getRecommendations(video, 12);
  const firstEp = video.episodes[0];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": video.category === "movie" ? "Movie" : "TVSeries",
            name: video.title,
            alternateName: video.originalTitle,
            image: video.cover,
            description: video.description,
            datePublished: video.year ? `${video.year}-01-01` : undefined,
            inLanguage: "zh-CN",
            countryOfOrigin: video.region,
            director: video.director ? { "@type": "Person", name: video.director } : undefined,
            actor: (video.actors ?? []).slice(0, 10).map((a) => ({ "@type": "Person", name: a })),
            genre: video.genres,
            aggregateRating:
              video.score > 0
                ? { "@type": "AggregateRating", ratingValue: video.score, bestRating: 10, ratingCount: 100 }
                : undefined,
          }),
        }}
      />
      {/* Backdrop hero */}
      <div className="relative -mx-4 md:-mx-8 -mt-6 mb-8">
        <div className="relative h-[260px] md:h-[360px] overflow-hidden">
          <Image src={video.backdrop} alt={video.title} fill priority sizes="100vw" className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div className="px-4 md:px-8 -mt-40 md:-mt-52 relative grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          <div className="hidden md:block relative aspect-[2/3] w-[200px] rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
            <Image src={video.cover} alt={video.title} fill sizes="200px" className="object-cover" />
          </div>
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted">
              <Link href={`/category/${video.category}`} className="px-2 py-0.5 rounded bg-accent/20 text-accent hover:bg-accent/30 transition">
                {CATEGORY_LABEL[video.category]}
              </Link>
              <span>{video.year}</span>
              <span>·</span>
              <span>{video.region}</span>
              <span>·</span>
              <span>{video.remarks}</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{video.title}</h1>
            {video.originalTitle && (
              <div className="text-sm text-muted mb-3">{video.originalTitle}</div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-primary font-bold text-xl">{video.score.toFixed(1)}</span>
              <span className="text-xs text-muted">/ 10</span>
              <div className="flex flex-wrap gap-1.5">
                {video.genres.map((g) => (
                  <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-muted">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-sm text-muted mb-1">
              <span className="text-text/80">导演：</span>
              {video.director}
            </div>
            <div className="text-sm text-muted mb-4">
              <span className="text-text/80">主演：</span>
              {video.actors.join(" / ")}
            </div>
            <p className="text-sm text-muted/90 leading-relaxed mb-6 max-w-3xl">{video.description}</p>
            <div className="flex items-center gap-3">
              <Link
                href={`/play/${video.id}/${firstEp.episodeId}`}
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary/80 font-semibold flex items-center gap-2 shadow-glow transition"
              >
                ▶ 立即播放
              </Link>
              <FavoriteButton videoId={video.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Sources & Episodes */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-primary rounded-full" />
          <h3 className="text-lg font-bold">播放线路</h3>
        </div>
        <div className="space-y-5 bg-surface/40 rounded-xl p-4 border border-white/5">
          {video.sources.map((s) => (
            <div key={s.sourceId}>
              <div className="flex items-center gap-2 mb-2 text-sm">
                <span className="px-2 py-0.5 rounded bg-accent/20 text-accent text-xs font-medium">
                  {s.sourceName}
                </span>
                <span className="text-xs text-muted">{s.lineName}</span>
                <span className="text-xs text-muted">· {s.quality}</span>
              </div>
              <EpisodeList videoId={video.id} episodes={video.episodes} />
            </div>
          ))}
        </div>
      </section>

      <SectionRow title="相关推荐" videos={recommendations} />

      <CommentSection videoId={video.id} />
    </div>
  );
}
