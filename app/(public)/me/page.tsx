import type { Metadata } from "next";
import MeClient from "./MeClient";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

// 用户私有页：noindex,nofollow（USER-01 / MROB-01）+ robots.txt Disallow 双重防护
export const metadata: Metadata = {
  title: `个人中心 - ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function MePage() {
  return <MeClient />;
}
