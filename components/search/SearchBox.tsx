"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/ui/Icon";

export default function SearchBox({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }

  return (
    <form onSubmit={submit} className="flex items-center bg-surface2 rounded-full border border-white/5 focus-within:border-accent/60 transition max-w-2xl">
      <span className="pl-5 text-muted flex items-center"><Icon name="search" size={18} /></span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索影视、演员、导演…"
        className="flex-1 bg-transparent px-3 py-3 outline-none text-sm placeholder:text-muted/60"
      />
      <button
        type="submit"
        className="m-1 px-5 py-2 text-sm rounded-full bg-primary hover:bg-primary/80 font-medium transition"
      >
        搜索
      </button>
    </form>
  );
}
