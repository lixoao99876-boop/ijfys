import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoGrid from "@/components/video/VideoGrid";
import { getCollectionBySlug } from "@/lib/api";
import { SITE_URL, SITE_NAME, SOCIAL_IMAGE } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) return { title: "专题不存在" };
  const canonical = `${SITE_URL}/collection/${slug}`;
  return {
    title: `${c.title} - ${SITE_NAME}专题`,
    description: c.description ?? `${c.title} 专题合集，共 ${c.items.length} 部作品，高清在线观看。`,
    alternates: { canonical },
    openGraph: {
      title: c.title,
      description: c.description ?? "",
      url: canonical,
      images: (c.cover ? [c.cover] : []).concat(SOCIAL_IMAGE),
      type: "website",
    },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) notFound();

  return (
    <div>
      {c.cover && (
        <div className="-mx-4 md:-mx-8 -mt-6 mb-8 relative h-[200px] md:h-[260px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.cover} alt={c.title} className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{c.title}</h1>
            {c.description && <p className="text-sm text-muted max-w-3xl">{c.description}</p>}
          </div>
        </div>
      )}
      {!c.cover && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{c.title}</h1>
          {c.description && <p className="text-sm text-muted">{c.description}</p>}
        </div>
      )}
      <p className="text-sm text-muted mb-4">共 {c.items.length} 部作品</p>
      <VideoGrid videos={c.items} />
    </div>
  );
}
