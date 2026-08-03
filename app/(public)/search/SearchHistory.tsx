"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";

const KEY = "ijfys.searchHistory";
const MAX = 12;

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export default function SearchHistory({ currentKeyword }: { currentKeyword: string }) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(load());
  }, []);

  useEffect(() => {
    if (!currentKeyword) return;
    const cur = load();
    const next = [currentKeyword, ...cur.filter((k) => k !== currentKeyword)].slice(0, MAX);
    save(next);
    setHistory(next);
  }, [currentKeyword]);

  if (history.length === 0) return null;

  function clear() {
    save([]);
    setHistory([]);
  }

  function remove(k: string) {
    const next = history.filter((x) => x !== k);
    save(next);
    setHistory(next);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">搜索记录：</span>
      {history.map((k) => (
        <span
          key={k}
          className="group inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs"
        >
          <Link href={`/search?q=${encodeURIComponent(k)}`} className="text-text">
            {k}
          </Link>
          <button
            onClick={() => remove(k)}
            className="text-muted/60 hover:text-muted flex items-center"
            title="移除"
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
      <button onClick={clear} className="text-xs text-muted hover:text-text ml-1">
        清空
      </button>
    </div>
  );
}
