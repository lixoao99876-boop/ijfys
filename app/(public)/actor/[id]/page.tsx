import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoGrid from "@/components/video/VideoGrid";
import { getActorDetail } from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getActorDetail(id);
  if (!data) return { title: "演员不存在" };
  const { actor, works } = data;
  const desc = actor.blurb
    ? actor.blurb.slice(0, 140)
    : `${actor.name}${actor.area ? "（" + actor.area + "）" : ""} 个人资料、代表作${works.length ? "、" + works.slice(0, 3).map((w) => w.title).join("、") : ""}。`;
  return {
    title: `${actor.name} - 飓风影视`,
    description: desc,
    keywords: [actor.name, actor.alias, actor.area, "演员", "影视作品"].filter(Boolean).join(", "),
    openGraph: {
      title: `${actor.name}`,
      description: desc,
      images: actor.cover ? [actor.cover] : [],
      type: "profile",
    },
  };
}

export default async function ActorPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getActorDetail(id);
  if (!data) notFound();
  const { actor, works } = data;

  const facts = ([
    ["性别", actor.sex],
    ["地区", actor.area],
    ["生日", actor.birthday],
    ["身高", actor.height],
    ["体重", actor.weight],
    ["出生地", actor.birthplace],
    ["血型", actor.bloodType],
    ["星座", actor.starSign],
    ["毕业院校", actor.school],
  ] as Array<[string, string | null]>).filter(([, v]) => !!v);

  return (
    <div>
      {/* JSON-LD：Person */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: actor.name,
            alternateName: actor.alias,
            birthDate: actor.birthday,
            birthPlace: actor.birthplace,
            nationality: actor.area,
            image: actor.cover,
            description: actor.blurb,
          }),
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 mb-8">
        <div>
          {actor.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={actor.cover}
              alt={actor.name}
              className="w-full aspect-[3/4] object-cover rounded-xl border border-white/10"
            />
          ) : (
            <div className="w-full aspect-[3/4] rounded-xl bg-surface2 border border-white/10 flex items-center justify-center text-4xl text-muted">
              {actor.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-text mb-1">{actor.name}</h1>
          {actor.alias && <p className="text-sm text-muted mb-3">{actor.alias}</p>}
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm mb-4">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="text-text">{v}</dd>
              </div>
            ))}
          </dl>
          {actor.works && (
            <p className="text-sm text-muted">
              <span className="text-xs text-muted/70">资源站代表作：</span>
              {actor.works}
            </p>
          )}
          {actor.blurb && (
            <p className="mt-3 text-sm leading-relaxed text-text/85 whitespace-pre-wrap">{actor.blurb}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-4 bg-primary rounded-full" />
        <h2 className="text-base font-semibold">参演作品</h2>
        <span className="text-xs text-muted">共 {works.length} 部</span>
      </div>

      {works.length > 0 ? (
        <VideoGrid videos={works} />
      ) : (
        <div className="text-center text-muted py-12 text-sm">
          暂未关联到作品（资源站尚未提供该演员的影片，或同步尚未覆盖）。
        </div>
      )}
    </div>
  );
}
