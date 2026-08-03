import type { Metadata } from "next";
import HistoryClient from "./HistoryClient";
import { SITE_NAME } from "@/lib/site";

// 本地观看历史页：用户专属、无收录价值 → noindex,follow + robots.txt Disallow
export const metadata: Metadata = {
  title: `观看历史 - ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function HistoryPage() {
  return <HistoryClient />;
}
