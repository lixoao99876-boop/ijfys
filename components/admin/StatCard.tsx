import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  accent?: "default" | "primary" | "accent" | "warn";
}

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  default: "border-white/5",
  primary: "border-primary/30",
  accent: "border-accent/30",
  warn: "border-yellow-500/30",
};

export default function StatCard({
  label,
  value,
  hint,
  trend,
  trendLabel,
  accent = "default",
}: Props) {
  return (
    <div
      className={cn(
        "rounded-lg bg-[#0f141d] border p-4 flex flex-col gap-2",
        ACCENT[accent],
      )}
    >
      <div className="text-[11px] text-muted uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold tabular-nums text-text">{value}</div>
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{hint}</span>
        {trend && (
          <span
            className={cn(
              trend === "up" && "text-emerald-400",
              trend === "down" && "text-red-400",
              trend === "flat" && "text-muted",
            )}
          >
            {trend === "up" && "▲ "}
            {trend === "down" && "▼ "}
            {trend === "flat" && "— "}
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}
