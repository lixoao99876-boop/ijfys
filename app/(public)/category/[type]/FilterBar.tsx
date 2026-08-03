"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  type: string;
  genres: string[];
  regions: string[];
  years: string[];
  current: { genre: string; region: string; year: string; sort: string };
  hideGenre?: boolean;
}

const SORTS = [
  { value: "latest", label: "最新更新" },
  { value: "score", label: "评分最高" },
  { value: "year", label: "年份最新" },
];

export default function FilterBar({ type, genres, regions, years, current, hideGenre }: Props) {
  const router = useRouter();

  function navigate(patch: Partial<Props["current"]>) {
    const next = { ...current, ...patch };
    const qs = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) qs.set(k, String(v));
    });
    const q = qs.toString();
    router.push(`/category/${type}${q ? `?${q}` : ""}`);
  }

  return (
    <div className="space-y-3 bg-surface/40 rounded-xl p-4 border border-white/5">
      {!hideGenre && (
        <Row label="类型">
          <Chip active={!current.genre} onClick={() => navigate({ genre: "" })}>全部</Chip>
          {genres.map((g) => (
            <Chip key={g} active={current.genre === g} onClick={() => navigate({ genre: g })}>
              {g}
            </Chip>
          ))}
        </Row>
      )}
      <Row label="地区">
        <Chip active={!current.region} onClick={() => navigate({ region: "" })}>全部</Chip>
        {regions.map((r) => (
          <Chip key={r} active={current.region === r} onClick={() => navigate({ region: r })}>
            {r}
          </Chip>
        ))}
      </Row>
      <Row label="年份">
        <Chip active={!current.year} onClick={() => navigate({ year: "" })}>全部</Chip>
        {years.map((y) => (
          <Chip key={y} active={current.year === y} onClick={() => navigate({ year: y })}>
            {y}
          </Chip>
        ))}
      </Row>
      <Row label="排序">
        {SORTS.map((s) => (
          <Chip
            key={s.value}
            active={current.sort === s.value}
            onClick={() => navigate({ sort: s.value })}
          >
            {s.label}
          </Chip>
        ))}
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-12 shrink-0 text-muted pt-1">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs transition border",
        active
          ? "bg-primary border-primary text-white"
          : "bg-transparent border-white/10 text-muted hover:text-text hover:border-white/30",
      )}
    >
      {children}
    </button>
  );
}
