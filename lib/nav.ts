import type { IconName } from "@/components/ui/Icon";

/** 站点主导航（桌面侧栏 + 移动抽屉共用） */
export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const NAV: NavItem[] = [
  { href: "/", label: "首页", icon: "home" },
  { href: "/category/movie", label: "热门电影", icon: "movie" },
  { href: "/category/tv", label: "热门影视", icon: "tv" },
  { href: "/category/ai-duanju", label: "AI短剧", icon: "robot" },
  { href: "/category/variety", label: "热门综艺", icon: "mic" },
  { href: "/category/anime", label: "热门动漫", icon: "dragon" },
  { href: "/category/short", label: "热门短剧", icon: "phone" },
  { href: "/article", label: "影视资讯", icon: "news" },
  { href: "/?tab=update", label: "最近更新", icon: "update" },
  { href: "/?tab=rank", label: "排行榜", icon: "trophy" },
  { href: "/?tab=app", label: "APP", icon: "app" },
];
