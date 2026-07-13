/**
 * 视频/剧集文案工具
 *
 * 核心问题：
 *  - 资源站给的 vod_remarks 良莠不齐："20260617" / "更新至 6 集" / "完结" / 空字符串
 *  - 剧集 ep.name 也不友好：可能是 "第1集" / "20250617" / "第15期"
 *
 * 本模块把原始数据归一化为用户友好文案，**不修改 DB**，仅 client-side 展示用。
 */

import type { Category } from "./types";

// ─── remarks 角标 ──────────────────────────────────────────────────

/**
 * 海报角标文案。优先级：
 *   1. 完结类（"完结"/"全X集"/"完整版"）→ "完结"
 *   2. 已知"更新至 X 集"模式 → 原样保留
 *   3. 纯日期（YYYYMMDD / YYYY-MM-DD / YYYY/MM/DD）→ "今日/昨日/M月D日更新"
 *   4. 其他短文本 → 原样保留
 *   5. 无 remarks 但有 updatedAt → 用 updatedAt 显示更新日期
 *   6. 都没有 → "" （UI 端不渲染）
 */
export function formatRemarks(
  remarks: string | null | undefined,
  updatedAtIso: string | null | undefined,
  category?: Category,
): string {
  const raw = (remarks ?? "").trim();

  // 1) 完结
  if (/^(完结|全[\d一二三四五六七八九十百]+集|完整版|大结局|END|完)$/i.test(raw)) {
    return "完结";
  }

  // 2) "更新至 N 集" / "更新到 N 集" / "更新至 20260617"
  if (/^(更新至|更新到|更新|已更新)/.test(raw)) {
    const tail = raw.replace(/^(更新至|更新到|更新|已更新)/, "").trim();
    // 2a) tail 是纯日期 → 相对日期标签
    const dateOnly = tryFormatPureDate(tail);
    if (dateOnly) return dateOnly;
    // 2b) 含日期 + 集/期/话（如 "20260618(第3期加更下)"）→ 剥日期/括号，取语义部分
    if (/\d{8}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(tail) && /集|期|话/.test(tail)) {
      const cleaned = tail
        .replace(/\d{8}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g, "")
        .replace(/[\s\(\)（）]/g, "")
        .trim();
      // cleaned 必须包含数字或≥3字符才算有效语义，否则回退到日期
      if (cleaned && (/\d/.test(cleaned) || cleaned.length >= 3)) {
        return `更新至${cleaned}`;
      }
      const m = tail.match(/(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})/);
      if (m) return relativeUpdateLabel(+m[1], +m[2], +m[3]);
    }
    // 2c) 纯集数形式（"6 集"/"第12期"）
    if (/集|期|话/.test(tail)) return `更新至${tail.replace(/\s+/g, "")}`;
    // 2d) tail 非空但不识别 → 退到 updatedAt
    if (!tail) return formatUpdatedAt(updatedAtIso) || raw;
    return formatUpdatedAt(updatedAtIso) || raw.replace(/\s+/g, "");
  }
  // 单独"HD"/"高清"/"BD" 这种画质标记不显示
  if (/^(HD|BD|HC|TC|4K|1080[pP]|720[pP])$/i.test(raw)) {
    // 这些不算"更新状态"，回退到 updatedAt
    return formatUpdatedAt(updatedAtIso) || raw;
  }

  // 3) 纯日期
  const dateLabel = tryFormatPureDate(raw);
  if (dateLabel) return dateLabel;

  // 4) "第 N 集" / "X 集" / "第X期"
  if (/第[\d一二三四五六七八九十百]+(集|期|话)/.test(raw) || /^\d+\s*(集|期|话)$/.test(raw)) {
    return raw.startsWith("第") || raw.startsWith("更新")
      ? raw
      : `更新至${raw}`;
  }

  // 5) 含纯日期子串（如 "20260617 更新"）— 也按相对日期格式化
  const embedded = raw.match(/(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})/);
  if (embedded) {
    const label = relativeUpdateLabel(+embedded[1], +embedded[2], +embedded[3]);
    if (label) return label;
  }

  // 6) remarks 非空但模式未知 → 原样
  if (raw) return raw;

  // 7) 兜底：用 updatedAt
  return formatUpdatedAt(updatedAtIso) || (category === "movie" ? "高清" : "");
}

/** 把日期串（多种格式）转为 "今日更新 / 昨日更新 / M月D日更新" */
function tryFormatPureDate(s: string): string {
  // YYYYMMDD（8 位连续数字）
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return relativeUpdateLabel(+m[1], +m[2], +m[3]);
  // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return relativeUpdateLabel(+m[1], +m[2], +m[3]);
  return "";
}

function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return relativeUpdateLabel(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function relativeUpdateLabel(y: number, mo: number, d: number): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(y, mo - 1, d);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return "今日更新";
  if (diffDays === 1) return "昨日更新";
  if (diffDays > 1 && diffDays <= 7) return "本周更新";
  if (diffDays < 0) return `${mo}月${d}日上线`;
  // 当年内的过去日期：M月D日更新；跨年：YYYY-MM-DD
  if (y === today.getFullYear()) return `${mo}月${d}日更新`;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── episode 名称 ─────────────────────────────────────────────────

/**
 * 智能渲染单集 label：
 *   - 综艺：解析 ep.name 中的日期 → "YYYY-MM-DD" 或 "M月D日"；带"第X期"则用原文
 *   - 连续剧 / 动漫 / 短剧：固定输出"第N集"（基于 index）
 *   - 电影：通常只有 1 集，原文（"HD"/"正片"）
 *
 * compact=true 时尽量短（仅数字）
 */
export function formatEpisodeLabel(
  ep: { name: string; index: number },
  category: Category | undefined,
  compact = false,
): string {
  const n = ep.index + 1;
  const name = (ep.name ?? "").trim();

  if (category === "variety") {
    // 综艺：日期优先
    const date = extractEpisodeDate(name);
    if (date) {
      if (compact) return `${date.mo}.${date.d}`;
      return `${date.y}-${String(date.mo).padStart(2, "0")}-${String(date.d).padStart(2, "0")}期`;
    }
    // 含"第X期"/"X期"原样
    if (/第\d+期|^\d+期$/.test(name)) return compact ? name.replace(/期/g, "") : name;
    return compact ? String(n) : `第${n}期`;
  }

  if (category === "movie") {
    // 电影只有一集；name 是 "HD"/"正片"/某线路名
    return name || "正片";
  }

  // 连续剧 / 动漫 / 短剧：用 index 数字
  if (compact) return String(n);
  // 原名是 "第N集" / 单纯数字 → "第N集"；带名字的（如"序章 - 风波起"）保留原文
  if (/^第\d+集$/.test(name) || /^\d+$/.test(name) || /^EP\d+$/i.test(name) || /^第\d+话$/.test(name)) {
    return `第${n}集`;
  }
  // 资源站偶有把日期放在剧集名（如更新日）→ "第N集"
  if (extractEpisodeDate(name)) return `第${n}集`;
  // 默认用原文（可能含标题"第1集 序章"）
  return name || `第${n}集`;
}

function extractEpisodeDate(s: string): { y: number; mo: number; d: number } | null {
  // YYYYMMDD
  let m = s.match(/\b(\d{4})(\d{2})(\d{2})\b/);
  if (m) return { y: +m[1], mo: +m[2], d: +m[3] };
  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  m = s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return { y: +m[1], mo: +m[2], d: +m[3] };
  return null;
}
