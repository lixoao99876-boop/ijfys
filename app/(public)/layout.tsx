import type { ReactNode } from "react";
import MainLayout from "@/components/layout/MainLayout";
import Analytics from "@/components/Analytics";

export default function PublicGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Analytics />
      <MainLayout>{children}</MainLayout>
    </>
  );
}
