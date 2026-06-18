"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

interface Props {
  placeholder?: string;
  paramKey?: string; // 默认 q
  basePath: string;
}

export default function SearchBar({ placeholder = "搜索...", paramKey = "q", basePath }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [value, setValue] = useState(sp.get(paramKey) ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(sp.get(paramKey) ?? "");
  }, [sp, paramKey]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const usp = new URLSearchParams(sp.toString());
    if (value.trim()) usp.set(paramKey, value.trim());
    else usp.delete(paramKey);
    usp.delete("page");
    const qs = usp.toString();
    startTransition(() => {
      router.push(`${basePath}${qs ? `?${qs}` : ""}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-56 px-3 rounded-md bg-white/[0.04] border border-white/10 text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary/40"
      />
      <button
        type="submit"
        className="h-8 px-3 rounded-md text-sm border border-white/10 text-muted hover:text-text hover:border-white/30"
      >
        搜索
      </button>
    </form>
  );
}
