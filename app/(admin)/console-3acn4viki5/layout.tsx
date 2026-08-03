import type { ReactNode } from "react";
import type { Metadata } from "next";

// 后台整体禁止被搜索引擎索引（密径不进 sitemap/robots，这里再加一层 noindex）
export const metadata: Metadata = {
  title: "控制台",
  robots: { index: false, follow: false, nocache: true },
};

/** 密径根布局：仅透传。真正的登录门禁在 (panel)/layout.tsx，login 页不在其下故不受限。 */
export default function ConsoleRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
