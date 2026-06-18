import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoGrid from "@/components/video/VideoGrid";
import FilterBar from "./FilterBar";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import {
  getVideosByCategory,
  listGenres,
  listRegions,
  listYears,
} from "@/lib/api";

const VALID: Category[] = ["movie", "tv", "anime", "variety", "short"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!VALID.includes(type as Category)) return {};
  const label = CATEGORY_LABEL[type as Category];
  return {
    title: `${label}大全 - 在线观看 - 飓风影视`,
    description: `${label}：电影、剧集、动漫、综艺、短剧高清在线观看，每日更新。`,
    keywords: [label, "在线观看", "高清", "免费", "飓风影视"].join(", "),
    openGraph: {
      title: `${label}大全 - 飓风影视`,
      description: `${label}高清在线观看`,
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
  if (!VALID.includes(type as Category)) notFound();
  const category = type as Category;

  const genre = (sp.genre as string) || "";
  const region = (sp.region as string) || "";
  const year = (sp.year as string) || "";
  const sort = (sp.sort as string) || "latest";

  // 全部下推到后端：筛选 + 排序在 DB 上完成
  const [list, genresOpt, regionsOpt, yearsOpt] = await Promise.all([
    getVideosByCategory(category, { genre, region, year, sort }),
    listGenres(category),
    listRegions(category),
    listYears(category),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{CATEGORY_LABEL[category]}</h1>
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
