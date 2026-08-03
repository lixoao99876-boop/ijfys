/**
 * 筛选项聚合映射层
 *
 * 设计原则：
 *   - 数据库保留资源站抓取的原始 region / genres / year 值（碎、杂）
 *   - 前端只展示这里定义的"聚合标签"白名单（稳定、克制）
 *   - 用户点击聚合标签 → 后端用映射展开成原始值 OR 范围，再下推 WHERE
 *
 * 三类聚合：
 *   - GENRE_AGGREGATION:  genres[] 字段。"动作" → hasSome(["动作","动作片","武打",...])
 *   - REGION_AGGREGATION: region 字段。"大陆" → IN ["大陆","中国","内地",...]
 *                        "其他" 是兜底：region NOT IN 全部具名地区的并集
 *   - YEAR_AGGREGATION:   year 字段。"2024" → year=2024；"2010年代" → 2010 ≤ year < 2020
 */

import type { Prisma } from "@prisma/client";

export const GENRE_AGGREGATION: Record<string, string[]> = {
  动作: ["动作", "动作片", "武打", "功夫", "格斗", "枪战", "武侠"],
  喜剧: ["喜剧", "喜剧片", "搞笑", "爆笑", "无厘头", "情景喜剧"],
  爱情: ["爱情", "爱情片", "言情", "都市爱情", "甜宠", "纯爱", "偶像", "青春"],
  悬疑: ["悬疑", "悬疑片", "推理", "烧脑"],
  科幻: ["科幻", "科幻片", "末日", "太空", "未来"],
  恐怖: ["恐怖", "恐怖片", "惊悚", "灵异", "鬼怪"],
  战争: ["战争", "战争片", "军旅", "抗战", "二战"],
  犯罪: ["犯罪", "犯罪片", "黑帮", "警匪", "黑色"],
  动画: ["动画", "动漫", "卡通", "番剧", "动漫电影"],
  纪录片: ["纪录片", "纪实", "纪录", "记录", "Documentary"],
  家庭: ["家庭", "亲情", "伦理", "家庭剧"],
  冒险: ["冒险", "探险", "夺宝"],
  奇幻: ["奇幻", "玄幻", "魔幻", "仙侠", "魔法", "神话"],
  历史: ["历史", "古装", "宫廷", "传记", "年代", "历史剧"],
};

/**
 * 虚拟/专题聚合：不进 GENRE_LABELS 下拉（不污染普通分类筛选），
 * 仅供 AI 板块等程序化落地页按 genre 参数查询。
 * "AI漫剧" = 资源站原始标签 AI漫 ∪ AI漫剧（互斥两标签，合计约 3156 部，均在 tv 分类）。
 */
export const VIRTUAL_GENRE_AGGREGATION: Record<string, string[]> = {
  AI漫剧: ["AI漫", "AI漫剧"],
};

export const REGION_AGGREGATION: Record<string, string[]> = {
  大陆: ["大陆", "中国", "中国大陆", "内地", "中国内地", "国产", "国语", "华语"],
  香港: ["香港", "中国香港", "港", "港台"],
  台湾: ["台湾", "中国台湾", "台", "台湾省"],
  美国: ["美国", "美", "好莱坞", "美国电影"],
  英国: ["英国", "英", "BBC", "英剧"],
  日本: ["日本", "日", "东京"],
  韩国: ["韩国", "韩", "南韩"],
  泰国: ["泰国", "泰"],
  印度: ["印度", "宝莱坞"],
  欧洲: [
    "法国", "德国", "意大利", "西班牙", "俄罗斯", "瑞典", "荷兰",
    "比利时", "波兰", "丹麦", "挪威", "芬兰", "葡萄牙", "希腊",
    "捷克", "匈牙利", "爱尔兰", "苏格兰", "奥地利", "瑞士",
    "其他欧洲", "欧洲", "欧美", "西欧", "北欧", "东欧",
  ],
};

/** "其他"地区：除上述具名分组以外的所有 region 取值 */
export const REGION_LABEL_OTHER = "其他";

/** 年代映射：[起始年(含), 截止年(不含)] */
export const YEAR_AGGREGATION: Record<string, [number, number]> = {
  "2026": [2026, 2027],
  "2025": [2025, 2026],
  "2024": [2024, 2025],
  "2023": [2023, 2024],
  "2022": [2022, 2023],
  "2021": [2021, 2022],
  "2020": [2020, 2021],
  "2010年代": [2010, 2020],
  "2000年代": [2000, 2010],
  "90年代": [1990, 2000],
  "80年代及以前": [0, 1990],
};

/** 前端显示用的固定标签顺序 */
export const GENRE_LABELS: string[] = Object.keys(GENRE_AGGREGATION);
export const REGION_LABELS: string[] = [...Object.keys(REGION_AGGREGATION), REGION_LABEL_OTHER];
// 显式指定：从新到旧（V8 会把纯数字字符串键自动升序，所以不能用 Object.keys）
export const YEAR_LABELS: string[] = [
  "2026", "2025", "2024", "2023", "2022", "2021", "2020",
  "2010年代", "2000年代", "90年代", "80年代及以前",
];

/** 所有具名地区的原始值并集（用于"其他"取反） */
const NAMED_REGION_VALUES: string[] = Array.from(
  new Set(Object.values(REGION_AGGREGATION).flat()),
);

/** 把单个聚合标签翻译成 Prisma Where 片段；命中不到返回 null（调用方可忽略） */
export function genreFilter(label?: string): Prisma.VideoWhereInput | null {
  if (!label) return null;
  const raw = GENRE_AGGREGATION[label] ?? VIRTUAL_GENRE_AGGREGATION[label];
  if (!raw || raw.length === 0) return null;
  return { genres: { hasSome: raw } };
}

export function regionFilter(label?: string): Prisma.VideoWhereInput | null {
  if (!label) return null;
  if (label === REGION_LABEL_OTHER) {
    return {
      AND: [{ region: { not: null } }, { region: { notIn: NAMED_REGION_VALUES } }],
    };
  }
  const raw = REGION_AGGREGATION[label];
  if (!raw || raw.length === 0) return null;
  return { region: { in: raw } };
}

export function yearFilter(label?: string): Prisma.VideoWhereInput | null {
  if (!label) return null;
  const range = YEAR_AGGREGATION[label];
  if (!range) return null;
  const [gte, lt] = range;
  return { year: { gte, lt } };
}
