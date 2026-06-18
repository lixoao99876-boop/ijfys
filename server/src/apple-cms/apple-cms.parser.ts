import type { AppleCmsActor, AppleCmsArticle, AppleCmsVod, ParsedPlaySource } from "./apple-cms.types";

/**
 * 苹果 CMS V10：
 *   vod_play_from: "ffm3u8$$$lz_m3u8"
 *   vod_play_url:  "第1集$URL1#第2集$URL2$$$第1集$URLA#第2集$URLB"
 * 两边按 $$$ 拆分必须对齐。
 */
export function parsePlay(vod: AppleCmsVod): ParsedPlaySource[] {
  const from = (vod.vod_play_from ?? "").split("$$$").map((s) => s.trim()).filter(Boolean);
  const urls = (vod.vod_play_url ?? "").split("$$$");
  if (from.length === 0 || from.length !== urls.length) return [];

  return from.map((code, srcIdx) => {
    const raw = urls[srcIdx] ?? "";
    const eps = raw
      .split("#")
      .map((seg, i) => {
        const [name, url] = seg.split("$");
        if (!url) return null;
        return { name: (name ?? `第 ${i + 1} 集`).trim(), url: url.trim(), index: i };
      })
      .filter((e): e is { name: string; url: string; index: number } => !!e && /^https?:\/\//.test(e.url));
    return { code, episodes: eps };
  });
}

const QUALITY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(2160p|4k|uhd)\b/i, "4K"],
  [/\b(1080p|fhd|蓝光)\b/i, "1080P"],
  [/\b(720p|hd)\b/i, "720P"],
  [/\b(480p|sd)\b/i, "480P"],
  [/(原画|超清)/i, "原画"],
];

export function detectQuality(...samples: string[]): string {
  const text = samples.filter(Boolean).join(" ");
  for (const [re, label] of QUALITY_PATTERNS) {
    if (re.test(text)) return label;
  }
  return "未知";
}

export function detectCategory(typeName?: string): "movie" | "tv" | "anime" | "variety" | "short" | "unknown" {
  if (!typeName) return "unknown";
  const t = typeName.toLowerCase();
  // 短剧族（必须早于"剧"匹配）
  if (/(短剧|微剧|微短|竖屏|小剧场|微电影)/i.test(t)) return "short";
  // 动漫
  if (/(动漫|动画|anime|卡通)/i.test(t)) return "anime";
  // 综艺 / 体育也归综艺
  if (/(综艺|show|variety|真人秀|脱口秀|纪录|体育|足球|篮球|网球|赛事|演唱会)/i.test(t)) return "variety";
  // 电影：含"片"或显式"电影"
  if (/(电影|movie|film|片$|动作片|喜剧片|爱情片|科幻片|恐怖片|战争片|剧情片|犯罪片|惊悚片|奇幻片|悬疑片)/i.test(t)) return "movie";
  // 剧集（兜底）
  if (/(连续剧|电视剧|tv|series|剧集|国产剧|港台剧|日韩剧|海外剧|欧美剧|大陆剧|韩剧|日剧|台剧|美剧|英剧|泰剧|网剧|剧$)/i.test(t)) return "tv";
  return "unknown";
}

const NORMALIZE_RE = /[\s·.\-_,，。！!?？:：()（）【】\[\]"'《》<>「」]+/g;

/** 跨资源站去重键：标题归一化 + 年份。category 不参与（不同站分类不一致） */
export function buildExternalKey(title: string, year?: string | number | null, _category?: string): string {
  const t = String(title ?? "").toLowerCase().replace(NORMALIZE_RE, "");
  const y = year ? String(year).match(/\d{4}/)?.[0] ?? "" : "";
  return `${t}|${y}`;
}

export function safeYear(raw?: string): number | null {
  if (!raw) return null;
  const m = String(raw).match(/\d{4}/);
  if (!m) return null;
  const y = Number(m[0]);
  return y >= 1900 && y < 2100 ? y : null;
}

export function safeScore(raw?: string): number {
  const n = Number(raw);
  return isFinite(n) && n >= 0 && n <= 10 ? n : 0;
}

export function splitList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,，、\/|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function safeDate(raw?: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

function clean(s?: string | null): string | null {
  if (s === undefined || s === null) return null;
  const t = String(s).replace(/<[^>]+>/g, "").trim();
  return t.length === 0 ? null : t;
}

function safeInt(n?: number | string | null): number {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

/** 演员归一化：跨 provider 去重键 = 归一化姓名 */
export function buildActorExternalKey(name: string): string {
  return String(name ?? "").toLowerCase().replace(NORMALIZE_RE, "");
}

export interface NormalizedActor {
  externalKey: string;
  name: string;
  alias: string | null;
  sex: string | null;
  area: string | null;
  height: string | null;
  weight: string | null;
  birthday: string | null;
  birthplace: string | null;
  bloodType: string | null;
  starSign: string | null;
  school: string | null;
  works: string | null;
  cover: string | null;
  blurb: string | null;
  remarks: string | null;
  providerActorId: string;
  sourceUpdatedAt: Date | null;
}

export function normalizeActor(raw: AppleCmsActor): NormalizedActor | null {
  const name = clean(raw.actor_name);
  if (!name) return null;
  return {
    externalKey: buildActorExternalKey(name),
    name,
    alias: clean(raw.actor_alias),
    sex: clean(raw.actor_sex),
    area: clean(raw.actor_area),
    height: clean(raw.actor_height),
    weight: clean(raw.actor_weight),
    birthday: clean(raw.actor_birthday),
    birthplace: clean(raw.actor_birtharea),
    bloodType: clean(raw.actor_blood),
    starSign: clean(raw.actor_starsign),
    school: clean(raw.actor_school),
    works: clean(raw.actor_works),
    cover: normalizeUrl(raw.actor_pic),
    blurb: clean(raw.actor_blurb),
    remarks: clean(raw.actor_remarks),
    providerActorId: String(raw.actor_id),
    sourceUpdatedAt: safeDate(raw.actor_time),
  };
}

export interface NormalizedArticle {
  providerArtId: string;
  title: string;
  subtitle: string | null;
  typeName: string | null;
  author: string | null;
  fromSite: string | null;
  cover: string | null;
  picSlide: string | null;
  blurb: string | null;
  content: string | null;
  jumpUrl: string | null;
  score: number;
  hits: number;
  upVotes: number;
  downVotes: number;
  remarks: string | null;
  sourceUpdatedAt: Date | null;
}

export function normalizeArticle(raw: AppleCmsArticle): NormalizedArticle | null {
  const title = clean(raw.art_name);
  if (!title) return null;
  return {
    providerArtId: String(raw.art_id),
    title,
    subtitle: clean(raw.art_sub),
    typeName: clean(raw.type_name),
    author: clean(raw.art_author),
    fromSite: clean(raw.art_from),
    cover: normalizeUrl(raw.art_pic),
    picSlide: normalizeUrl(raw.art_pic_slide),
    blurb: clean(raw.art_blurb),
    content: raw.art_content ? String(raw.art_content) : null, // 保留 HTML
    jumpUrl: clean(raw.art_jumpurl),
    score: safeScore(typeof raw.art_score === "number" ? String(raw.art_score) : raw.art_score),
    hits: safeInt(raw.art_hits),
    upVotes: safeInt(raw.art_up),
    downVotes: safeInt(raw.art_down),
    remarks: clean(raw.art_remarks),
    sourceUpdatedAt: safeDate(raw.art_time),
  };
}

/** 协议相对 URL → https，其余原样 */
function normalizeUrl(u?: string | null): string | null {
  const t = clean(u);
  if (!t) return null;
  if (t.startsWith("//")) return `https:${t}`;
  return t;
}
