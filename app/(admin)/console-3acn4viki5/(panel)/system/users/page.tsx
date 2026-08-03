import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";

interface AdminUser {
  id: number;
  username: string;
  realName: string;
  email: string;
  role: "super" | "editor" | "ops" | "viewer";
  lastLogin: string;
  status: "active" | "disabled";
}

const ROLE_LABEL: Record<AdminUser["role"], { label: string; tone: "info" | "warn" | "success" | "muted" }> = {
  super: { label: "超级管理员", tone: "warn" },
  editor: { label: "内容编辑", tone: "info" },
  ops: { label: "运营人员", tone: "success" },
  viewer: { label: "只读账号", tone: "muted" },
};

const MOCK_USERS: AdminUser[] = [
  { id: 1, username: "admin", realName: "系统管理员", email: "admin@example.com", role: "super", lastLogin: "刚刚", status: "active" },
  { id: 2, username: "editor01", realName: "张编辑", email: "editor01@example.com", role: "editor", lastLogin: "2 小时前", status: "active" },
  { id: 3, username: "ops01", realName: "李运营", email: "ops01@example.com", role: "ops", lastLogin: "昨天", status: "active" },
  { id: 4, username: "guest", realName: "访客只读", email: "guest@example.com", role: "viewer", lastLogin: "未登录", status: "disabled" },
];

export default function AdminUsersPage() {
  const cols: DataTableColumn<AdminUser>[] = [
    { key: "username", header: "账号", cell: (u) => <span className="text-text font-mono">{u.username}</span> },
    { key: "name", header: "姓名", cell: (u) => <span className="text-text">{u.realName}</span> },
    { key: "email", header: "邮箱", cell: (u) => <span className="text-xs text-muted">{u.email}</span> },
    {
      key: "role",
      header: "角色",
      cell: (u) => <Badge tone={ROLE_LABEL[u.role].tone}>{ROLE_LABEL[u.role].label}</Badge>,
    },
    { key: "lastLogin", header: "最近登录", cell: (u) => <span className="text-xs text-muted">{u.lastLogin}</span> },
    {
      key: "status",
      header: "状态",
      cell: (u) => (u.status === "active" ? <Badge tone="success">启用</Badge> : <Badge tone="muted">停用</Badge>),
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      cell: () => (
        <div className="flex justify-end gap-1.5 text-xs">
          <button className="border border-white/10 rounded px-2 py-0.5 text-muted cursor-not-allowed opacity-60" disabled>编辑</button>
          <button className="border border-white/10 rounded px-2 py-0.5 text-muted cursor-not-allowed opacity-60" disabled>重置密码</button>
          <button className="border border-red-500/30 rounded px-2 py-0.5 text-red-300 cursor-not-allowed opacity-60" disabled>停用</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="管理员列表"
        description="平台后台账号管理"
        breadcrumb={["系统管理", "管理员列表"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            + 新增管理员
          </button>
        }
      />
      <DataTable columns={cols} rows={MOCK_USERS} caption="账号体系待接入，当前为示例数据" />
    </div>
  );
}
