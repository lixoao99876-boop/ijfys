import PageHeader from "@/components/admin/PageHeader";
import ProvidersTable from "./ProvidersTable";
import { fetchProviders } from "@/lib/admin/api";

export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  const list = await fetchProviders();
  return (
    <div>
      <PageHeader
        title="资源站管理"
        description="对接资源站状态、线路数、同步/播放成功率与最近错误"
        breadcrumb={["资源管理", "资源站管理"]}
      />
      <ProvidersTable items={list} />
    </div>
  );
}
