import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import SourceEpisodePicker from "@/components/video/SourceEpisodePicker";
import SectionRow from "@/components/home/SectionRow";
import FavoriteButton from "@/components/video/FavoriteButton";
import CommentSection from "@/components/video/CommentSection";
import Icon from "@/components/ui/Icon";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import { getRecommendations, getVideoById } from "@/lib/api";
import { formatRemarks } from "@/lib/episode-format";
import { SITE_URL, SITE_NAME, SOCIAL_IMAGE, breadcrumbLd } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideoById(id);
  if (!video) return { title: `影片不存在 - ${SITE_NAME}` };
  const cat = CATEGORY_LABEL[video.category] ?? "影视";
  const en = video.enrichment;
  const canonical = `${SITE_URL}/vod/${video.id}`;

  const titleParts = [`《${video.title}》`];
  // CMS 原名字段可能塞一串别名，超长的不进 title（防搜索结果被截断）
  if (video.originalTitle && video.originalTitle.length <= 25) titleParts.push(`(${video.originalTitle})`);
  if (video.year) titleParts.push(` ${video.year}`);
  const title = `${titleParts.join("")} - 剧情/演员/在线观看 - ${SITE_NAME}`;

  const desc = (
    en?.detailedDescription ??
    video.description ??
    `${cat}《${video.title}》${video.year} ${video.region} ${video.remarks ?? ""} 在线观看`
  )
    .replace(/\s+/g, " ")
    .slice(0, 150);

  return {
    title,
    description: desc,
    keywords: [
      video.title,
      video.originalTitle,
      cat,
      video.region,
      String(video.year),
      ...(en?.genresDetailed ?? video.genres ?? []),
      ...(en?.keywords ?? []).slice(0, 8),
      ...(video.actors ?? []).slice(0, 5),
      ...(en?.directors ?? (video.director ? [video.director] : [])),
    ]
      .filter(Boolean)
      .join(", "),
    alternates: { canonical },
    openGraph: {
      title,
      description: desc,
      url: canonical,
      images: ([en?.backdropTmdb, en?.posterTmdb, video.cover, video.backdrop].filter(Boolean) as string[]).concat(SOCIAL_IMAGE),
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
  const en = video.enrichment;
  const directors = en?.directors ?? (video.director ? [video.director] : []);
  const longDesc = en?.detailedDescription ?? video.description;

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd([
              { name: "首页", url: SITE_URL },
              { name: CATEGORY_LABEL[video.category], url: `${SITE_URL}/category/${video.category}` },
              { name: video.title, url: `${SITE_URL}/vod/${video.id}` },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": video.category === "movie" ? "Movie" : "TVSeries",
            name: video.title,
            alternateName: video.originalTitle,
            url: `${SITE_URL}/vod/${video.id}`,
            image: en?.posterTmdb ?? video.cover,
            description: longDesc,
            datePublished: en?.releaseDate ?? (video.year ? `${video.year}-01-01` : undefined),
            inLanguage: "zh-CN",
            countryOfOrigin: video.region || undefined,
            duration: en?.runtime ? `PT${en.runtime}M` : undefined,
            sameAs: en?.imdbId ? `https://www.imdb.com/title/${en.imdbId}/` : undefined,
            director: directors.map((d) => ({ "@type": "Person", name: d })),
            author: (en?.writers ?? []).map((w) => ({ "@type": "Person", name: w })),
            actor: (video.actors ?? []).slice(0, 10).map((a) => ({ "@type": "Person", name: a })),
            genre: en?.genresDetailed ?? video.genres,
            keywords: (en?.keywords ?? []).join(",") || undefined,
            // SD-02：只输出有真实票数支撑的评分，禁止编造 ratingCount
            aggregateRating:
              en?.tmdbRating && en?.tmdbVoteCount
                ? {
                    "@type": "AggregateRating",
                    ratingValue: en.tmdbRating,
                    ratingCount: en.tmdbVoteCount,
                    bestRating: 10,
                  }
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
              {formatRemarks(video.remarks, video.updatedAt, video.category as Category) && (
                <>
                  <span>·</span>
                  <span>{formatRemarks(video.remarks, video.updatedAt, video.category as Category)}</span>
                </>
              )}
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
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary/80 font-semibold flex items-center gap-1.5 shadow-glow transition"
              >
                <Icon name="play" size={17} /> 立即播放
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
          <h3 className="text-lg font-bold">播放线路与选集</h3>
        </div>
        <div className="bg-surface/40 rounded-xl p-4 border border-white/5">
          <SourceEpisodePicker
            videoId={video.id}
            category={video.category as Category}
            episodes={video.episodes}
            sources={video.sources}
          />
        </div>
      </section>

      {/* SEO 结构化内容区块：剧情简介 + 影片资料 */}
      {(longDesc || directors.length > 0 || en) && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-lg font-bold">
              《{video.title}》剧情简介
            </h2>
          </div>
          <div className="bg-surface/40 rounded-xl p-5 border border-white/5">
            {longDesc && <p className="text-sm text-muted/90 leading-relaxed mb-5 whitespace-pre-line">{longDesc}</p>}
            <h3 className="text-base font-semibold mb-3">影片资料</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {directors.length > 0 && (
                <div className="flex gap-2">
                  <dt className="text-text/80 shrink-0">导演：</dt>
                  <dd className="text-muted">{directors.join(" / ")}</dd>
                </div>
              )}
              {(en?.writers?.length ?? 0) > 0 && (
                <div className="flex gap-2">
                  <dt className="text-text/80 shrink-0">编剧：</dt>
                  <dd className="text-muted">{en!.writers!.join(" / ")}</dd>
                </div>
              )}
              {video.actors.length > 0 && (
                <div className="flex gap-2 md:col-span-2">
                  <dt className="text-text/80 shrink-0">主演：</dt>
                  <dd className="text-muted">{video.actors.slice(0, 12).join(" / ")}</dd>
                </div>
              )}
              {(en?.genresDetailed ?? video.genres).length > 0 && (
                <div className="flex gap-2">
                  <dt className="text-text/80 shrink-0">类型：</dt>
                  <dd className="text-muted">{(en?.genresDetailed ?? video.genres).join(" / ")}</dd>
                </div>
              )}
              {(en?.releaseDate || video.year > 0) && (
                <div className="flex gap-2">
                  <dt className="text-text/80 shrink-0">上映时间：</dt>
                  <dd className="text-muted">{en?.releaseDate ?? video.year}</dd>
                </div>
              )}
              {en?.runtime ? (
                <div className="flex gap-2">
                  <dt className="text-text/80 shrink-0">片长：</dt>
                  <dd className="text-muted">{en.runtime} 分钟</dd>
                </div>
              ) : null}
              {en?.tmdbRating ? (
                <div className="flex gap-2">
                  <dt className="text-text/80 shrink-0">TMDB 评分：</dt>
                  <dd className="text-muted">
                    {en.tmdbRating.toFixed(1)}（{en.tmdbVoteCount ?? 0} 人评）
                  </dd>
                </div>
              ) : null}
              {video.originalTitle && (
                <div className="flex gap-2">
                  <dt className="text-text/80 shrink-0">原名：</dt>
                  <dd className="text-muted">{video.originalTitle}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      <SectionRow title="相关推荐" videos={recommendations} />

      <CommentSection videoId={video.id} />
    </div>
  );
}
