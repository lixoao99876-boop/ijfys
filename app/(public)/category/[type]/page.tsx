import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import VideoGrid from "@/components/video/VideoGrid";
import FilterBar from "./FilterBar";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import { SITE_URL, SITE_NAME, SOCIAL_IMAGE, breadcrumbLd } from "@/lib/site";
import {
  getVideosByCategory,
  listGenres,
  listRegions,
  listYears,
} from "@/lib/api";
import { AI_SECTION_MAP, AI_SLUG_REDIRECTS } from "@/lib/ai-sections";

const VALID: Category[] = ["movie", "tv", "anime", "variety", "short"];

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { type } = await params;
  const sp = await searchParams;

  // AI 板块（虚拟分类）：独立 SEO 文案，canonical 自指
  const ai = AI_SECTION_MAP.get(type);
  if (ai) {
    const hasFilterAi = Boolean(
      sp.region || sp.year || (sp.sort && sp.sort !== "latest") || (sp.page && sp.page !== "1"),
    );
    const canonicalAi = `${SITE_URL}/category/${type}`;
    return {
      title: `${ai.seoTitle} - ${SITE_NAME}`,
      description: ai.seoDesc,
      alternates: { canonical: canonicalAi },
      robots: hasFilterAi ? { index: false, follow: true } : undefined,
      openGraph: {
        title: `${ai.label}大全 - ${SITE_NAME}`,
        description: ai.seoDesc,
        url: canonicalAi,
        images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630 }],
        type: "website",
      },
    };
  }

  if (!VALID.includes(type as Category)) return {};
  const label = CATEGORY_LABEL[type as Category];
  // 多维筛选 / 深层分页组合页 noindex,follow（PAGE-03），canonical 统一收敛到无参分类页（CAN-05）
  const hasFilter = Boolean(
    sp.genre || sp.region || sp.year || (sp.sort && sp.sort !== "latest") || (sp.page && sp.page !== "1"),
  );
  const canonical = `${SITE_URL}/category/${type}`;
  return {
    title: `${label}大全 - 高清${label}在线观看 - ${SITE_NAME}`,
    description: `${SITE_NAME}${label}频道汇聚海量高清${label}资源，涵盖热门新片与经典作品，可按类型、地区、年份筛选，在线播放、每日更新、免费观看。`,
    alternates: { canonical },
    robots: hasFilter ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${label}大全 - ${SITE_NAME}`,
      description: `${label}高清在线观看，每日更新`,
      url: canonical,
      images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630 }],
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { type } = await params;
  const sp = await searchParams;

  // 旧 slug 兼容 301
  const redirectTo = AI_SLUG_REDIRECTS[type];
  if (redirectTo) redirect(`/category/${redirectTo}`);

  const region = (sp.region as string) || "";
  const year = (sp.year as string) || "";
  const sort = (sp.sort as string) || "latest";

  // ---------- AI 板块（虚拟分类）----------
  const ai = AI_SECTION_MAP.get(type);
  if (ai) {
    // 锁定 genre；跨分类(backingCategory=all)取全部 AI 视频；genre 不受 URL 参数控制
    const [list, regionsOpt, yearsOpt] = await Promise.all([
      getVideosByCategory(ai.backingCategory, { genre: ai.lockedGenre ?? "", region, year, sort }),
      listRegions(ai.filterCategory),
      listYears(ai.filterCategory),
    ]);
    return (
      <div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              breadcrumbLd([
                { name: "首页", url: SITE_URL },
                { name: ai.label, url: `${SITE_URL}/category/${ai.slug}` },
              ]),
            ),
          }}
        />
        <nav aria-label="面包屑" className="text-xs text-muted mb-3">
          <Link href="/" className="hover:text-text">首页</Link>
          <span className="mx-1.5">›</span>
          <span className="text-text">{ai.label}</span>
        </nav>
        <h1 className="text-2xl font-bold mb-2">
          <span className="mr-1.5">{ai.icon}</span>{ai.label}
        </h1>
        <p className="text-sm text-muted/90 leading-relaxed mb-3 max-w-3xl">{ai.intro}</p>
        <p className="text-sm text-muted mb-6">共 {list.length} 部</p>
        <FilterBar
          type={ai.slug}
          genres={[]}
          regions={regionsOpt}
          years={yearsOpt}
          current={{ genre: "", region, year, sort }}
          hideGenre
        />
        <div className="mt-6">
          <VideoGrid videos={list} />
        </div>
      </div>
    );
  }

  if (!VALID.includes(type as Category)) notFound();
  const category = type as Category;
  const genre = (sp.genre as string) || "";

  // 全部下推到后端：筛选 + 排序在 DB 上完成
  const [list, genresOpt, regionsOpt, yearsOpt] = await Promise.all([
    getVideosByCategory(category, { genre, region, year, sort }),
    listGenres(category),
    listRegions(category),
    listYears(category),
  ]);

  const label = CATEGORY_LABEL[category];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd([
              { name: "首页", url: SITE_URL },
              { name: label, url: `${SITE_URL}/category/${category}` },
            ]),
          ),
        }}
      />
      <nav aria-label="面包屑" className="text-xs text-muted mb-3">
        <Link href="/" className="hover:text-text">首页</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text">{label}</span>
      </nav>
      <h1 className="text-2xl font-bold mb-2">{label}</h1>
      <p className="text-sm text-muted/90 leading-relaxed mb-3 max-w-3xl">
        {SITE_NAME}{label}频道为你精选海量高清{label}资源，涵盖最新热映与经典高分作品，支持按类型、地区、年份自由筛选，在线播放、每日更新、全部免费在线观看。
      </p>
      <p className="text-sm text-muted mb-6">共 {list.length} 部</p>
      <FilterBar
        type={category}
        genres={genresOpt}
        regions={regionsOpt}
        years={yearsOpt}
        current={{ genre, region, year, sort }}
      />
      <div className="mt-6">
        <VideoGrid videos={list} />
      </div>
    </div>
  );
}
