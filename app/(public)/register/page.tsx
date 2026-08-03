import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

// 用户私有页：noindex,nofollow（USER-01 / MROB-01）+ robots.txt Disallow 双重防护
export const metadata: Metadata = {
  title: `注册 - ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
