import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: string[];
}

export default function PageHeader({ title, description, actions, breadcrumb }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="text-[11px] text-muted/70 mb-1.5 flex items-center gap-1">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted/40">/</span>}
                <span>{b}</span>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
