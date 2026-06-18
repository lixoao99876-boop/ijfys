"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HistoryItem } from "@/lib/types";

interface HistoryState {
  items: HistoryItem[];
  upsert: (item: HistoryItem) => void;
  remove: (videoId: string) => void;
  clear: () => void;
  getByVideo: (videoId: string) => HistoryItem | undefined;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      upsert: (item) =>
        set((s) => {
          const others = s.items.filter((x) => x.videoId !== item.videoId);
          return { items: [item, ...others].slice(0, 100) };
        }),
      remove: (videoId) => set((s) => ({ items: s.items.filter((x) => x.videoId !== videoId) })),
      clear: () => set({ items: [] }),
      getByVideo: (videoId) => get().items.find((x) => x.videoId === videoId),
    }),
    {
      name: "ijfys-history",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as never))),
    },
  ),
);
