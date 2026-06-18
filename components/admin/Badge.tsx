import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warn" | "error" | "info" | "muted";

const TONES: Record<Tone, string> = {
  default: "bg-white/[0.06] text-text border-white/10",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  warn: "bg-yellow-500/10 text-yellow-300 border-yellow-500/25",
  error: "bg-red-500/10 text-red-300 border-red-500/25",
  info: "bg-accent/10 text-indigo-300 border-accent/25",
  muted: "bg-white/[0.03] text-muted border-white/5",
};

export default function Badge({
  tone = "default",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
