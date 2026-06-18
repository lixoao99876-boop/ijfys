import PageHeader from "@/components/admin/PageHeader";
import HomeConfigEditor from "./HomeConfigEditor";
import { fetchHomeConfig } from "@/lib/admin/api";

export const dynamic = "force-dynamic";

export default async function AdminHomeConfigPage() {
  const channels = await fetchHomeConfig();
  return (
    <div>
      <PageHeader
        title="首页配置"
        description="Banner / 7 个推荐频道 · 拖动排序 · 启停 · 手动指定视频"
        breadcrumb={["系统设置", "首页配置"]}
      />
      <HomeConfigEditor initial={channels} />
    </div>
  );
}
