"use client";

import type { Source } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  sources: Source[];
  currentSourceId: string;
  failedSources?: Set<string>;
  onChange: (sourceId: string) => void;
}

export default function SourceTabs({ sources, currentSourceId, failedSources, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((s) => {
        const active = s.sourceId === currentSourceId;
        const failed = failedSources?.has(s.sourceId);
        return (
          <button
            key={s.sourceId}
            onClick={() => onChange(s.sourceId)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs border transition flex items-center gap-1.5",
              active
                ? "bg-accent/20 border-accent text-accent"
                : "bg-surface2 border-white/5 text-muted hover:text-text",
              failed && !active && "opacity-50 line-through",
            )}
          >
            <span className="font-medium">{s.sourceName}</span>
            <span className="text-[10px] opacity-70">{s.quality}</span>
          </button>
        );
      })}
    </div>
  );
}
