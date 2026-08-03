import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { SITE_NAME } from "@/lib/site";

export const metadata = { title: `${SITE_NAME} - 运营后台` };

const ADMIN_BASE_PATH = "/console-3acn4viki5";
const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const AUTH_COOKIE = "ijfys_token";
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/** 服务端门禁：未登录或非管理员 → 跳登录页。此布局不包裹 login，故无重定向死循环 */
async function requireAdmin() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) redirect(`${ADMIN_BASE_PATH}/login`);
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { cookie: `${AUTH_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) redirect(`${ADMIN_BASE_PATH}/login`);
    const me = (await res.json()) as { role?: string; isBanned?: boolean } | null;
    if (!me || me.isBanned || !ADMIN_ROLES.has(me.role ?? "")) {
      redirect(`${ADMIN_BASE_PATH}/login?denied=1`);
    }
  } catch (e) {
    // redirect() 内部抛的 NEXT_REDIRECT 必须原样冒泡，不能吞
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    redirect(`${ADMIN_BASE_PATH}/login`);
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen flex bg-background text-text">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar />
        <main className="flex-1 px-6 py-6 max-w-[1400px] w-full">{children}</main>
      </div>
    </div>
  );
}
