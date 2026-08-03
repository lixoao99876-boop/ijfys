import { notFound } from "next/navigation";
import { fetchSitePages, type SitePageKind } from "@/lib/admin/api";
import PagesManager from "./PagesManager";

const KIND_MAP: Record<string, { kind: SitePageKind; label: string; desc: string }> = {
  news: { kind: "NEWS", label: "资讯管理", desc: "网站信息页与资讯文章（FAQ、联系我们、隐私政策等系统页会显示在网站底部）" },
  announcement: { kind: "ANNOUNCEMENT", label: "公告", desc: "站点公告，展示在「最新公告」页" },
};

export default async function PagesAdmin({ params }: { params: Promise<{ kind: string }> }) {
  const { kind: kindParam } = await params;
  const conf = KIND_MAP[kindParam];
  if (!conf) notFound();

  const pages = await fetchSitePages(conf.kind);

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{conf.label}</h1>
      <p className="text-sm text-muted mb-6">{conf.desc}</p>
      <PagesManager kind={conf.kind} initial={pages} />
    </div>
  );
}
