import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  cell: (row: T, idx: number) => ReactNode;
}

interface Props<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  empty?: ReactNode;
  caption?: ReactNode;
}

/** 简洁的 CMS 表格：深色、紧凑、悬停高亮 */
export default function DataTable<T>({ columns, rows, empty, caption }: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-white/5 bg-[#0f141d] p-12 text-center text-sm text-muted">
        {empty ?? "暂无数据"}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/5 bg-[#0f141d] overflow-hidden">
      {caption && (
        <div className="px-4 py-2 border-b border-white/5 text-[11px] text-muted">{caption}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] border-b border-white/5">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "text-[11px] uppercase tracking-wider text-muted font-normal py-2.5 px-3 whitespace-nowrap",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    !c.align && "text-left",
                  )}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={idx}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "py-2.5 px-3 align-middle",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                    )}
                  >
                    {c.cell(r, idx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
