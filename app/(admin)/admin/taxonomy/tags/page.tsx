import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";

// 占位：等业务接入后从 tags 表读取；这里把现有"聚合筛选标签"作为初始内容
const MOCK_TAGS: Array<{
  id: number;
  group: "类型" | "地区" | "年代";
  name: string;
  count: number;
  enabled: boolean;
}> = [
  { id: 1, group: "类型", name: "动作", count: 2840, enabled: true },
  { id: 2, group: "类型", name: "喜剧", count: 3120, enabled: true },
  { id: 3, group: "类型", name: "爱情", count: 2510, enabled: true },
  { id: 4, group: "类型", name: "悬疑", count: 980, enabled: true },
  { id: 5, group: "类型", name: "科幻", count: 720, enabled: true },
  { id: 6, group: "类型", name: "动画", count: 5286, enabled: true },
  { id: 7, group: "地区", name: "大陆", count: 42088, enabled: true },
  { id: 8, group: "地区", name: "香港", count: 3211, enabled: true },
  { id: 9, group: "地区", name: "美国", count: 9874, enabled: true },
  { id: 10, group: "地区", name: "日本", count: 4520, enabled: true },
  { id: 11, group: "地区", name: "韩国", count: 3890, enabled: true },
  { id: 12, group: "年代", name: "2026", count: 4101, enabled: true },
  { id: 13, group: "年代", name: "2025", count: 12455, enabled: true },
  { id: 14, group: "年代", name: "2010年代", count: 18092, enabled: true },
];

export default function AdminTagsPage() {
  type Row = (typeof MOCK_TAGS)[number];
  const cols: DataTableColumn<Row>[] = [
    {
      key: "group",
      header: "分组",
      cell: (r) => (
        <Badge tone={r.group === "类型" ? "info" : r.group === "地区" ? "warn" : "muted"}>{r.group}</Badge>
      ),
    },
    { key: "name", header: "标签", cell: (r) => <span className="text-text">{r.name}</span> },
    { key: "count", header: "关联内容数", align: "right", cell: (r) => <span className="tabular-nums text-xs">{r.count.toLocaleString()}</span> },
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
          <button className="border border-white/10 rounded px-2 py-0.5 text-muted cursor-not-allowed opacity-60" disabled>合并</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="标签管理"
        description="管理类型 / 地区 / 年代等聚合筛选标签的展示与启用"
        breadcrumb={["分类管理", "标签管理"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            + 新增标签
          </button>
        }
      />
      <DataTable
        columns={cols}
        rows={MOCK_TAGS}
        caption="当前数据为聚合映射层（filter-aggregations.ts）的回显，业务接入后写入 tags 表"
      />
    </div>
  );
}
