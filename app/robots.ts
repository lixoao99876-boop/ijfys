import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const SITE = SITE_URL;

// 私有/无收录价值路径（不含后台密径——密径靠鉴权+noindex 保护，写进 robots 反而泄露）
const PRIVATE = ["/admin", "/admin/", "/api/", "/login", "/register", "/me", "/history"];

// 显式欢迎的 AI 搜索/训练爬虫（GEO：让 AI 引擎正确抓取并认知 51爱播）
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
