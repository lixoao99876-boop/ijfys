/**
 * 站点元信息（域名 / 品牌名）— 从环境变量读取，无硬编码
 *
 * 环境变量：
 *   NEXT_PUBLIC_SITE_URL    必填，公网根 URL（含 scheme），例 https://your-domain.com
 *   NEXT_PUBLIC_SITE_NAME   必填，品牌名，例 "飓风影视"
 *
 * 生产 (NODE_ENV=production) 缺失时 build/render 立即抛错，避免回退到错误域名。
 * 开发默认 http://localhost:3000 / "飓风影视 (dev)"。
 */

const DEFAULT_DEV_URL = "http://localhost:3000";
const DEFAULT_DEV_NAME = "飓风影视 (dev)";

function readEnv(key: string, defaultDev: string): string {
  const v = process.env[key];
  if (v && v.trim()) return v.trim();
  if (process.env.NODE_ENV === "production") {
    throw new Error(`[site] ${key} 必须在生产环境设置`);
  }
  return defaultDev;
}

export const SITE_URL = readEnv("NEXT_PUBLIC_SITE_URL", DEFAULT_DEV_URL);
export const SITE_NAME = readEnv("NEXT_PUBLIC_SITE_NAME", DEFAULT_DEV_NAME);

/** 不带 scheme 的 host（用于 sitemap host 字段、邮箱后缀等） */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
