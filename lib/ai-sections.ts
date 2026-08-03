import type { Category } from "@/lib/types";
import { SITE_NAME } from "@/lib/site";

/**
 * AI 影视板块（虚拟分类）。落地页复用 /category/[type] 结构，数据源是 genre 标签，
 * 不新增 Category 枚举、不迁移数据。
 * 目前只有一个 AI 板块「AI短剧」= 全站所有 AI 类型视频（genre AI漫 ∪ AI漫剧）。
 */
export interface AiSection {
  slug: string;                 // URL: /category/{slug}
  label: string;                // 侧栏 / H1
  icon: string;
  backingCategory: Category | "all"; // 底层查询分类；"all" = 跨全部分类
  lockedGenre?: string;         // 锁定 genre 聚合标签
  filterCategory: Category;     // 筛选项(地区/年份)取哪个分类的标签集
  seoTitle: string;
  seoDesc: string;
  intro: string;
}

export const AI_SECTIONS: AiSection[] = [
  {
    slug: "ai-duanju",
    label: "AI短剧",
    icon: "🤖",
    backingCategory: "all",
    lockedGenre: "AI漫剧", // 聚合标签 → hasSome(["AI漫","AI漫剧"])
    filterCategory: "tv",
    seoTitle: "AI短剧大全 - AI短剧免费在线观看",
    seoDesc:
      `AI短剧频道汇聚全站海量 AI 生成短剧，涵盖修仙、玄幻、爽文、穿越、都市等热门题材，每日更新、高清在线、免费观看。追最新最火的 AI 短剧就来${SITE_NAME}。`,
    intro:
      "AI短剧是以人工智能生成技术制作的短剧，题材涵盖修仙玄幻、都市爽文、穿越重生等，节奏明快、强反转、更新极快。本频道汇聚全站热门 AI 短剧资源，支持在线播放、免费观看、每日更新。",
  },
];

export const AI_SECTION_MAP: Map<string, AiSection> = new Map(
  AI_SECTIONS.map((s) => [s.slug, s]),
);

/** 旧密径 slug → 新 slug 的 301 兼容映射（曾短暂上线的 ai-manju） */
export const AI_SLUG_REDIRECTS: Record<string, string> = {
  "ai-manju": "ai-duanju",
};

export function isAiSection(slug: string): boolean {
  return AI_SECTION_MAP.has(slug);
}
