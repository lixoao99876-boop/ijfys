/**
 * 站点元信息（域名 / 品牌名）— 从环境变量读取，无硬编码
 *
 * 环境变量（必须在 .env / .env.production 中设置）：
 *   NEXT_PUBLIC_SITE_URL    公网根 URL（含 scheme），例 https://your-domain.com
 *   NEXT_PUBLIC_SITE_NAME   品牌名，例 "飓风影视"
 *
 * 注意：必须用直接访问 `process.env.NEXT_PUBLIC_X` 才能让 Next.js / webpack
 * 在 build 时把它替换为字符串字面量。不能用 process.env[key] 动态访问，
 * 否则 client bundle 拿不到值。
 */

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const RAW_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME;

// 生产环境缺失立即报错（在 server 启动 / client hydration 时执行）
if (process.env.NODE_ENV === "production") {
  if (!RAW_SITE_URL) {
    // eslint-disable-next-line no-console
    console.error("[site] NEXT_PUBLIC_SITE_URL must be set in production");
  }
  if (!RAW_SITE_NAME) {
    // eslint-disable-next-line no-console
    console.error("[site] NEXT_PUBLIC_SITE_NAME must be set in production");
  }
}

export const SITE_URL: string = (RAW_SITE_URL && RAW_SITE_URL.trim()) || "http://localhost:3000";
export const SITE_NAME: string = (RAW_SITE_NAME && RAW_SITE_NAME.trim()) || "飓风影视";

/** 不带 scheme 的 host */
export const SITE_HOST: string = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
