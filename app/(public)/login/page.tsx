import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

// 用户私有页：noindex,nofollow（USER-01 / MROB-01）+ robots.txt Disallow 双重防护
export const metadata: Metadata = {
  title: `登录 - ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 text-center">登录{SITE_NAME}</h1>
      <Suspense fallback={<div className="text-center text-muted text-sm py-8">加载中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
