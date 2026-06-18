import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";

// 占位：未来从 themes 表读取。当前用前台左侧菜单的现状作为默认值展示。
const MOCK_THEMES = [
  { id: 1, code: "movie", name: "电影", icon: "🎬", order: 10, enabled: true, count: 28286 },
  { id: 2, code: "tv", name: "剧集", icon: "📺", order: 20, enabled: true, count: 16758 },
  { id: 3, code: "anime", name: "动漫", icon: "🌟", order: 30, enabled: true, count: 5286 },
  { id: 4, code: "variety", name: "综艺", icon: "🎤", order: 40, enabled: true, count: 15420 },
  { id: 5, code: "short", name: "短剧", icon: "📱", order: 50, enabled: true, count: 38001 },
];

export default function AdminThemesPage() {
  type Row = (typeof MOCK_THEMES)[number];
  const cols: DataTableColumn<Row>[] = [
    { key: "order", header: "排序", align: "center", cell: (r) => <span className="tabular-nums">{r.order}</span> },
    { key: "icon", header: "图标", cell: (r) => <span className="text-lg">{r.icon}</span> },
    { key: "name", header: "名称", cell: (r) => <span className="text-text font-medium">{r.name}</span> },
    { key: "code", header: "代码", cell: (r) => <code className="text-xs text-muted">{r.code}</code> },
    { key: "count", header: "内容数", align: "right", cell: (r) => <span className="tabular-nums text-xs">{r.count.toLocaleString()}</span> },
    {
      key: "status",
      header: "状态",
      cell: (r) => (r.enabled ? <Badge tone="success">启用</Badge> : <Badge tone="muted">停用</Badge>),
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      cell: () => (
        <div className="flex justify-end gap-1.5 text-xs">
          <button className="border border-white/10 rounded px-2 py-0.5 text-muted cursor-not-allowed opacity-60" disabled>编辑</button>
          <button className="border border-white/10 rounded px-2 py-0.5 text-muted cursor-not-allowed opacity-60" disabled>排序</button>
          <button className="border border-white/10 rounded px-2 py-0.5 text-muted cursor-not-allowed opacity-60" disabled>停用</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="主题管理"
        description="管理前台左侧菜单与频道：图标、排序、启用状态"
        breadcrumb={["分类管理", "主题管理"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            + 新增主题
          </button>
        }
      />
      <DataTable
        columns={cols}
        rows={MOCK_THEMES}
        caption="当前数据为前台已有分类的回显，待主题表落库后接入实际配置"
      />
    </div>
  );
}
