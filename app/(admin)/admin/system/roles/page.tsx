import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";

interface Role {
  code: string;
  name: string;
  description: string;
  users: number;
  permissions: { module: string; level: "read" | "write" | "admin" }[];
}

const ROLES: Role[] = [
  {
    code: "super",
    name: "超级管理员",
    description: "拥有所有模块的最高权限，含账号与权限配置",
    users: 1,
    permissions: [
      { module: "内容管理", level: "admin" },
      { module: "资源管理", level: "admin" },
      { module: "系统管理", level: "admin" },
      { module: "系统设置", level: "admin" },
    ],
  },
  {
    code: "editor",
    name: "内容编辑",
    description: "可编辑视频/演员/文章/标签等内容数据，无权改系统配置",
    users: 1,
    permissions: [
      { module: "内容管理", level: "write" },
      { module: "分类管理", level: "write" },
      { module: "统计管理", level: "read" },
    ],
  },
  {
    code: "ops",
    name: "运营人员",
    description: "可发起资源同步、配置首页推荐、查看统计",
    users: 1,
    permissions: [
      { module: "资源管理", level: "write" },
      { module: "首页配置", level: "write" },
      { module: "统计管理", level: "read" },
    ],
  },
  {
    code: "viewer",
    name: "只读账号",
    description: "仅可浏览统计与日志，不可修改任何数据",
    users: 1,
    permissions: [
      { module: "全部模块", level: "read" },
    ],
  },
];

const LEVEL_LABEL = { read: "只读", write: "读写", admin: "管理" };
const LEVEL_TONE: Record<"read" | "write" | "admin", "muted" | "info" | "warn"> = {
  read: "muted",
  write: "info",
  admin: "warn",
};

export default function AdminRolesPage() {
  const cols: DataTableColumn<Role>[] = [
    { key: "name", header: "角色名", cell: (r) => <span className="text-text font-medium">{r.name}</span> },
    { key: "code", header: "代码", cell: (r) => <code className="text-xs text-muted">{r.code}</code> },
    { key: "desc", header: "说明", cell: (r) => <span className="text-xs text-muted max-w-[420px] inline-block">{r.description}</span> },
    {
      key: "perms",
      header: "权限",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.permissions.map((p, i) => (
            <Badge key={i} tone={LEVEL_TONE[p.level]}>
              {p.module} · {LEVEL_LABEL[p.level]}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: "users", header: "成员数", align: "right", cell: (r) => <span className="tabular-nums text-xs">{r.users}</span> },
    {
      key: "actions",
      header: "操作",
      align: "right",
      cell: () => (
        <div className="flex justify-end gap-1.5 text-xs">
          <button className="border border-white/10 rounded px-2 py-0.5 text-muted cursor-not-allowed opacity-60" disabled>查看权限</button>
          <button className="border border-white/10 rounded px-2 py-0.5 text-muted cursor-not-allowed opacity-60" disabled>编辑</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="角色权限"
        description="4 级角色体系：超管 / 编辑 / 运营 / 只读"
        breadcrumb={["系统管理", "角色权限"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            + 新增角色
          </button>
        }
      />
      <DataTable columns={cols} rows={ROLES} caption="权限矩阵规划中，业务接入阶段会落库到 roles / permissions 表" />
    </div>
  );
}
