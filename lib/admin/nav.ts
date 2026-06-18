/** Admin 一级 + 二级菜单结构（信息架构） */

export interface AdminNavItem {
  label: string;
  href: string;
}

export interface AdminNavGroup {
  label: string;
  icon: string; // emoji 占位，未来可换 lucide
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "仪表盘",
    icon: "▦",
    items: [{ label: "概览", href: "/admin" }],
  },
  {
    label: "内容管理",
    icon: "▤",
    items: [
      { label: "视频管理", href: "/admin/content/videos" },
      { label: "演员管理", href: "/admin/content/actors" },
      { label: "文章管理", href: "/admin/content/articles" },
      { label: "专题合集", href: "/admin/content/collections" },
    ],
  },
  {
    label: "分类管理",
    icon: "◇",
    items: [
      { label: "主题管理", href: "/admin/taxonomy/themes" },
      { label: "标签管理", href: "/admin/taxonomy/tags" },
    ],
  },
  {
    label: "资源管理",
    icon: "↻",
    items: [
      { label: "资源站管理", href: "/admin/resources/providers" },
      { label: "线路管理", href: "/admin/resources/lines" },
      { label: "同步任务", href: "/admin/resources/sync" },
    ],
  },
  {
    label: "统计管理",
    icon: "◉",
    items: [
      { label: "数据概览", href: "/admin/analytics/overview" },
      { label: "流量统计", href: "/admin/analytics/traffic" },
      { label: "热门内容", href: "/admin/analytics/popular" },
    ],
  },
  {
    label: "系统管理",
    icon: "⚙",
    items: [
      { label: "管理员列表", href: "/admin/system/users" },
      { label: "角色权限", href: "/admin/system/roles" },
      { label: "评论审核", href: "/admin/system/comments" },
      { label: "操作日志", href: "/admin/system/logs" },
    ],
  },
  {
    label: "系统设置",
    icon: "✦",
    items: [
      { label: "网站设置", href: "/admin/settings/site" },
      { label: "SEO 设置", href: "/admin/settings/seo" },
      { label: "首页配置", href: "/admin/settings/homepage" },
    ],
  },
];
