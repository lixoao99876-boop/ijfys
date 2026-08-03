import type { SVGProps } from "react";

/**
 * 内联 SVG 图标库（单色线性，继承 currentColor）。替代全站 emoji，
 * 无外部依赖 / 不联网 / CSP 安全。所有 path 取自通用线性图标风格，24×24 视口。
 */
export type IconName =
  | "home" | "movie" | "tv" | "robot" | "mic" | "dragon" | "phone" | "news"
  | "trophy" | "app" | "update" | "search" | "clock" | "user" | "close"
  | "star" | "star-outline" | "plus" | "warning" | "bulb" | "planet"
  | "sparkle" | "gauge" | "grid" | "list" | "diamond" | "refresh" | "chart"
  | "gear" | "pencil" | "arrow-right" | "arrow-left" | "play";

const PATHS: Record<IconName, string> = {
  home: "M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10",
  movie: "M4 4h16v16H4zM4 9h16M8 4v16M16 4v16M4 14h16",
  tv: "M3 6h18v12H3zM8 21h8M12 18v3",
  robot: "M12 3v3M7 9h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2ZM9 13h.01M15 13h.01M3 12v3M21 12v3",
  mic: "M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
  dragon: "M4 12s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6ZM12 9v6M9 12h6",
  phone: "M7 2h10v20H7zM11 18h2",
  news: "M4 5h16v14H4zM8 9h8M8 13h8M8 17h5",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 14v6",
  app: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  update: "M4 4v6h6M20 20v-6h-6M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4",
  clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8v4l3 2",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21a8 8 0 0 1 16 0",
  close: "M6 6l12 12M18 6 6 18",
  star: "M12 3l2.6 5.6L21 9.3l-4.5 4.3 1.1 6.1L12 17l-5.6 2.7 1.1-6.1L3 9.3l6.4-.7z",
  "star-outline": "M12 4l2.3 4.9L20 9.5l-4 3.9 1 5.4L12 16.2 7 18.8l1-5.4-4-3.9 5.7-.6z",
  plus: "M12 5v14M5 12h14",
  warning: "M12 3 2 20h20L12 3ZM12 9v5M12 17h.01",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.7 1 1.5 1 2.5h6c0-1 .4-1.8 1-2.5A6 6 0 0 0 12 3Z",
  planet: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM3 15c5 3 13 3 18 0",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  gauge: "M12 5a8 8 0 0 0-8 8 8 8 0 0 0 2 5h12a8 8 0 0 0 2-5 8 8 0 0 0-8-8ZM12 13l4-3",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  diamond: "M12 3 21 12l-9 9-9-9z",
  refresh: "M4 4v6h6M20 20v-6h-6M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 12l2-1-1-3-2 .5a7 7 0 0 0-1.3-1.3L18 4l-3-1-1 2a7 7 0 0 0-2 0l-1-2-3 1 .6 2.2A7 7 0 0 0 6.3 7.5L4 7l-1 3 2 1a7 7 0 0 0 0 2l-2 1 1 3 2.3-.5a7 7 0 0 0 1.3 1.3L10 20l3 1 1-2a7 7 0 0 0 2 0l1 2 3-1-.6-2.2a7 7 0 0 0 1.3-1.3L21 17l-1-3-2-1a7 7 0 0 0 0-2Z",
  pencil: "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4",
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  "arrow-left": "M19 12H5M11 6l-6 6 6 6",
  play: "M7 4v16l13-8z",
};

// 实心风格图标（用 fill 而非 stroke）
const FILLED = new Set<IconName>(["star", "diamond", "sparkle", "play"]);

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 20, className, ...rest }: IconProps) {
  const filled = FILLED.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
