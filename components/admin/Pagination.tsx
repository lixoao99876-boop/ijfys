import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  total: number;
  limit: number;
  /** 基础路径，会自动追加 ?page=N（如果已带 query 用 hrefFor 覆写） */
  basePath: string;
  hrefFor?: (page: number) => string;
}

export default function Pagination({ page, total, limit, basePath, hrefFor }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount <= 1) return (
    <div className="text-[11px] text-muted text-right py-2">
      共 {total.toLocaleString()} 条
    </div>
  );

  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const items: number[] = [];
  for (let i = start; i <= end; i++) items.push(i);

  function href(p: number) {
    if (hrefFor) return hrefFor(p);
    const sep = basePath.includes("?") ? "&" : "?";
    return `${basePath}${sep}page=${p}`;
  }

  return (
    <div className="flex items-center justify-between mt-3 text-xs text-muted">
      <div>
        共 <span className="text-text tabular-nums">{total.toLocaleString()}</span> 条 · 第{" "}
        <span className="text-text tabular-nums">{page}</span> /{" "}
        <span className="tabular-nums">{pageCount}</span> 页
      </div>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link href={href(page - 1)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30">
            ←
          </Link>
        )}
        {items.map((p) => (
          <Link
            key={p}
            href={href(p)}
            className={cn(
              "px-2.5 py-1 rounded border tabular-nums",
              p === page
                ? "bg-primary/15 border-primary/40 text-primary"
                : "border-white/10 hover:border-white/30",
            )}
          >
            {p}
          </Link>
        ))}
        {page < pageCount && (
          <Link href={href(page + 1)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30">
            →
          </Link>
        )}
      </div>
    </div>
  );
}
