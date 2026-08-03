import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import EmptyState from "@/components/admin/EmptyState";

export default function AdminTrafficPage() {
  return (
    <div>
      <PageHeader
        title="流量统计"
        description="来源 / 设备 / 国家 / 关键词 · 待接入第三方统计"
        breadcrumb={["统计管理", "流量统计"]}
      />
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="自然搜索占比" value="—" hint="待接入" />
        <StatCard label="直接访问占比" value="—" hint="待接入" />
        <StatCard label="移动端占比" value="—" hint="待接入" />
        <StatCard label="跳出率" value="—" hint="待接入" />
      </div>
      <EmptyState
        title="流量统计模块待接入"
        description="规划接入：搜索关键词 Top 100、来源域名榜单、设备/操作系统分布、地域热力图。"
        hint="技术选型：GA4 Data API · GSC API · Plausible · 自建 web vital 埋点"
      />
    </div>
  );
}
