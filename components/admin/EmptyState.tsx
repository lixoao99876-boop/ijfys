import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  hint?: ReactNode;
}

/** 业务未接入的页面占位 */
export default function EmptyState({ title, description, hint }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.015] p-12 text-center">
      <div className="text-text font-medium">{title}</div>
      {description && <p className="text-sm text-muted mt-2 max-w-md mx-auto">{description}</p>}
      {hint && <div className="mt-4 text-xs text-muted">{hint}</div>}
    </div>
  );
}
