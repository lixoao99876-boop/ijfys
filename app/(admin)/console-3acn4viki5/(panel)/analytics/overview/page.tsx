import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import EmptyState from "@/components/admin/EmptyState";
import { fetchStats } from "@/lib/admin/api";
import { fmtNum } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const s = await fetchStats();
  const c = s.counters;

  return (
    <div>
      <PageHeader
        title="数据概览"
        description="网站核心指标与内容资产总览"
        breadcrumb={["统计管理", "数据概览"]}
      />

      <h2 className="text-xs uppercase tracking-wider text-muted mb-2">流量指标</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="累计 PV" value={c.pv ?? "—"} hint="待接入" />
        <StatCard label="累计 UV" value={c.uv ?? "—"} hint="待接入" />
        <StatCard label="独立 IP" value={c.ip ?? "—"} hint="待接入" />
        <StatCard label="DAU" value={c.dau ?? "—"} hint="待接入" />
      </div>

      <h2 className="text-xs uppercase tracking-wider text-muted mb-2">内容资产</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="视频" value={fmtNum(c.videos)} accent="primary" />
        <StatCard label="演员" value={fmtNum(c.actors)} />
        <StatCard label="文章" value={fmtNum(c.articles)} />
        <StatCard label="播放线路" value={fmtNum(c.sources)} accent="accent" />
      </div>

      <h2 className="text-xs uppercase tracking-wider text-muted mb-2">趋势图</h2>
      <EmptyState
        title="趋势图待接入"
        description="将在接入 GA4 / Plausible / 自建埋点后，展示近 30 天 PV·UV·新增视频·搜索关键词 4 张时序图。"
        hint="建议接入：GA4 Data API 或 Plausible API"
      />
    </div>
  );
}
