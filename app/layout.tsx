import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_HOST, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} ${SITE_HOST} - 高清在线影视`,
  description: `${SITE_NAME}：电影、剧集、综艺、动漫、短剧高清在线观看。`,
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
