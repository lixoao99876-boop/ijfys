import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import Sparkline from "@/components/admin/Sparkline";
import Badge from "@/components/admin/Badge";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import { fetchStats, fetchRankings, fetchDailyStats } from "@/lib/admin/api";
import { fmtAgo, fmtMs, fmtNum, fmtCategory } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [s, rk, daily] = await Promise.all([fetchStats(), fetchRankings(), fetchDailyStats(7)]);
  const pvSeries = daily.days.map((d) => d.pv);
  const uvSeries = daily.days.map((d) => d.uv);
  const ipSeries = daily.days.map((d) => d.ip);
  const dauSeries = daily.days.map((d) => d.dau);
  const c = s.counters;

  const recentCols: DataTableColumn<(typeof s.recentSyncs)[number]>[] = [
    {
      key: "provider",
      header: "资源站",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Badge tone="info">{r.provider}</Badge>
          <span>{r.providerName}</span>
        </div>
      ),
    },
    { key: "entity", header: "对象", cell: (r) => <Badge tone="muted">{r.entity}</Badge> },
    { key: "type", header: "类型", cell: (r) => <span className="text-muted">{r.type}</span> },
    {
      key: "status",
      header: "状态",
      cell: (r) =>
        r.status === "SUCCESS" ? <Badge tone="success">成功</Badge> :
        r.status === "FAILED" ? <Badge tone="error">失败</Badge> :
        <Badge tone="warn">运行中</Badge>,
    },
    {
      key: "items",
      header: "数据",
      align: "right",
      cell: (r) => (
        <span className="text-muted tabular-nums text-xs">
          见 {fmtNum(r.itemsSeen)} · +{fmtNum(r.videosAdded + r.actorsAdded + r.articlesAdded)}
        </span>
      ),
    },
    { key: "duration", header: "耗时", align: "right", cell: (r) => <span className="tabular-nums text-xs">{fmtMs(r.durationMs)}</span> },
    { key: "time", header: "时间", align: "right", cell: (r) => <span className="text-muted tabular-nums text-xs">{fmtAgo(r.startedAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="仪表盘"
        description="网站核心数据 + 资源同步状态总览"
        breadcrumb={["飓风影视", "仪表盘"]}
      />

      <h2 className="text-xs uppercase tracking-wider text-muted mb-2">流量指标（近 7 天）</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <SparkStat label="PV" today={c.pv} series={pvSeries} color="#ef4444" />
        <SparkStat label="UV" today={c.uv} series={uvSeries} color="#6366f1" />
        <SparkStat label="IP" today={c.ip} series={ipSeries} color="#10b981" />
        <SparkStat label="DAU" today={c.dau} series={dauSeries} color="#f59e0b" />
      </div>

      <h2 className="text-xs uppercase tracking-wider text-muted mb-2">内容资产</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="视频总数" value={fmtNum(c.videos)} hint="跨站去重后" accent="accent" />
        <StatCard label="演员总数" value={fmtNum(c.actors)} />
        <StatCard label="文章总数" value={fmtNum(c.articles)} />
        <StatCard label="活跃资源站" value={fmtNum(c.providers)} hint={`${fmtNum(c.sources)} 条线路`} />
      </div>

      {/* 3 个排行 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card title="资源站成功率排行" description="按播放成功率倒序">
          {rk.providersByRate.length === 0 ? (
            <Empty>尚无播放埋点数据，建议先在播放页触发几次成功播放</Empty>
          ) : (
            <ul className="text-sm divide-y divide-white/5">
              {rk.providersByRate.map((p, i) => (
                <li key={p.code} className="py-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`w-5 text-center tabular-nums ${i === 0 ? "text-primary font-medium" : "text-muted"}`}>{i + 1}</span>
                    <Badge tone="info">{p.code}</Badge>
                    <span className="text-text">{p.name}</span>
                  </span>
                  <span className="text-xs">
                    {p.successRate === null ? (
                      <span className="text-muted">待样本</span>
                    ) : (
                      <span className={p.successRate >= 90 ? "text-emerald-300" : p.successRate >= 70 ? "text-yellow-300" : "text-red-300"}>
                        {p.successRate}% <span className="text-muted">({p.total})</span>
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="热门影片排行" description="按累计播放次数">
          {rk.popularVideos.length === 0 ? (
            <Empty>尚无视频被播放过</Empty>
          ) : (
            <ul className="text-sm divide-y divide-white/5">
              {rk.popularVideos.map((v) => (
                <li key={v.id} className="py-2 flex items-center justify-between gap-2 min-w-0">
                  <a href={`/vod/${v.id}`} target="_blank" className="flex items-center gap-2 min-w-0 hover:text-primary">
                    <span className={`w-5 text-center tabular-nums shrink-0 ${v.rank <= 3 ? "text-primary font-medium" : "text-muted"}`}>{v.rank}</span>
                    {v.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.cover} alt="" className="w-6 h-8 object-cover rounded shrink-0" />
                    ) : <div className="w-6 h-8 rounded bg-surface2 shrink-0" />}
                    <span className="text-text truncate">{v.title}</span>
                    <Badge tone="muted">{fmtCategory(v.category)}</Badge>
                  </a>
                  <span className="text-xs text-muted tabular-nums shrink-0">{fmtNum(v.playCount)} 次</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="热门搜索排行" description="按搜索次数">
          {rk.popularSearches.length === 0 ? (
            <Empty>尚无搜索记录</Empty>
          ) : (
            <ul className="text-sm divide-y divide-white/5">
              {rk.popularSearches.map((s) => (
                <li key={s.keyword} className="py-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 text-center tabular-nums ${s.rank <= 3 ? "text-primary font-medium" : "text-muted"}`}>{s.rank}</span>
                    <a href={`/search?q=${encodeURIComponent(s.keyword)}`} target="_blank" className="text-text hover:text-primary truncate">
                      {s.keyword}
                    </a>
                  </span>
                  <span className="text-xs text-muted tabular-nums">{fmtNum(s.hits)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="text-xs uppercase tracking-wider text-muted mb-2">最近同步日志</h2>
      <DataTable columns={recentCols} rows={s.recentSyncs} />
    </div>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0f141d] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {description && <p className="text-[11px] text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted py-6 text-center">{children}</div>;
}

function SparkStat({
  label,
  today,
  series,
  color,
}: {
  label: string;
  today: number | null;
  series: number[];
  color: string;
}) {
  const todayVal = today ?? series[series.length - 1] ?? 0;
  const empty = series.every((v) => v === 0);
  return (
    <div className="rounded-lg bg-[#0f141d] border border-white/5 p-4 flex flex-col gap-2">
      <div className="text-[11px] text-muted uppercase tracking-wider">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold tabular-nums text-text">{empty ? "—" : todayVal.toLocaleString()}</div>
        <Sparkline data={series} stroke={color} fill={`${color}25`} width={100} height={28} />
      </div>
      <div className="text-[10px] text-muted">{empty ? "待接入埋点 / 暂无数据" : "近 7 天"}</div>
    </div>
  );
}
