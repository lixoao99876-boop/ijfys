import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0f141d] p-5 mb-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {description && <p className="text-xs text-muted mt-1">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 items-start py-2 border-b border-white/5 last:border-0">
      <div>
        <div className="text-xs text-text mt-1.5">{label}</div>
        {hint && <div className="text-[11px] text-muted/70 mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Input({ value, placeholder }: { value?: string; placeholder?: string }) {
  return (
    <input
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      disabled
      className="w-full h-8 px-3 rounded-md bg-white/[0.04] border border-white/10 text-sm text-text placeholder:text-muted/60 disabled:opacity-70"
    />
  );
}

export function Textarea({ value, placeholder, rows = 3 }: { value?: string; placeholder?: string; rows?: number }) {
  return (
    <textarea
      defaultValue={value}
      placeholder={placeholder}
      rows={rows}
      disabled
      className="w-full px-3 py-2 rounded-md bg-white/[0.04] border border-white/10 text-sm text-text placeholder:text-muted/60 disabled:opacity-70 resize-none"
    />
  );
}

export function Toggle({ value = false, label }: { value?: boolean; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-not-allowed opacity-70">
      <span className={`w-9 h-5 rounded-full p-0.5 transition ${value ? "bg-primary" : "bg-white/10"}`}>
        <span className={`block w-4 h-4 rounded-full bg-white transition ${value ? "translate-x-4" : ""}`} />
      </span>
      {label && <span className="text-xs text-muted">{label}</span>}
    </label>
  );
}
