import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 text-center">登录飓风影视</h1>
      <Suspense fallback={<div className="text-center text-muted text-sm py-8">加载中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
