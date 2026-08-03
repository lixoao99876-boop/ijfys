import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    // IMG-01：优先输出 AVIF / WebP（next/Image 自动按浏览器 Accept 协商）
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // 旧 AI Skill Hub 遗留路径 301 永久跳转到首页（新站无对应内容，
  // 既救回旧书签/外链的残余人流，又让搜索引擎尽快用新站首页替换旧索引）。
  async redirects() {
    // statusCode:301 而非 permanent(=308)，明确用经典 301 Moved Permanently
    return [
      { source: "/skill/:path*", destination: "/", statusCode: 301 },
      { source: "/best/:path*", destination: "/", statusCode: 301 },
      { source: "/culture/:path*", destination: "/", statusCode: 301 },
    ];
  },
};

export default nextConfig;
