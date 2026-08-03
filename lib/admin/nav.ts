/** Admin 一级 + 二级菜单结构（信息架构） */
import type { IconName } from "@/components/ui/Icon";

export interface AdminNavItem {
  label: string;
  href: string;
}

export interface AdminNavGroup {
  label: string;
  icon: IconName;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "仪表盘",
    icon: "gauge",
    items: [{ label: "概览", href: "/console-3acn4viki5" }],
  },
  {
    label: "内容管理",
    icon: "grid",
    items: [
      { label: "视频管理", href: "/console-3acn4viki5/content/videos" },
      { label: "演员管理", href: "/console-3acn4viki5/content/actors" },
      { label: "文章管理", href: "/console-3acn4viki5/content/articles" },
      { label: "专题合集", href: "/console-3acn4viki5/content/collections" },
    ],
  },
  {
    label: "文章",
    icon: "pencil",
    items: [
      { label: "资讯管理", href: "/console-3acn4viki5/pages/news" },
      { label: "公告", href: "/console-3acn4viki5/pages/announcement" },
    ],
  },
  {
    label: "分类管理",
    icon: "diamond",
    items: [
      { label: "主题管理", href: "/console-3acn4viki5/taxonomy/themes" },
      { label: "标签管理", href: "/console-3acn4viki5/taxonomy/tags" },
    ],
  },
  {
    label: "资源管理",
    icon: "refresh",
    items: [
      { label: "资源站管理", href: "/console-3acn4viki5/resources/providers" },
      { label: "线路管理", href: "/console-3acn4viki5/resources/lines" },
      { label: "同步任务", href: "/console-3acn4viki5/resources/sync" },
    ],
  },
  {
    label: "统计管理",
    icon: "chart",
    items: [
      { label: "数据概览", href: "/console-3acn4viki5/analytics/overview" },
      { label: "流量统计", href: "/console-3acn4viki5/analytics/traffic" },
      { label: "热门内容", href: "/console-3acn4viki5/analytics/popular" },
    ],
  },
  {
    label: "系统管理",
    icon: "gear",
    items: [
      { label: "管理员列表", href: "/console-3acn4viki5/system/users" },
      { label: "角色权限", href: "/console-3acn4viki5/system/roles" },
      { label: "评论审核", href: "/console-3acn4viki5/system/comments" },
      { label: "操作日志", href: "/console-3acn4viki5/system/logs" },
    ],
  },
  {
    label: "系统设置",
    icon: "sparkle",
    items: [
      { label: "网站设置", href: "/console-3acn4viki5/settings/site" },
      { label: "SEO 设置", href: "/console-3acn4viki5/settings/seo" },
      { label: "首页配置", href: "/console-3acn4viki5/settings/homepage" },
    ],
  },
];
