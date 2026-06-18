"use client";

import { create } from "zustand";

interface PlayerState {
  currentSourceId: string | null;
  currentEpisodeId: string | null;
  failedSources: Set<string>;
  setSource: (id: string) => void;
  setEpisode: (id: string) => void;
  markSourceFailed: (id: string) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSourceId: null,
  currentEpisodeId: null,
  failedSources: new Set(),
  setSource: (id) => set({ currentSourceId: id }),
  setEpisode: (id) => set({ currentEpisodeId: id }),
  markSourceFailed: (id) =>
    set((s) => {
      const next = new Set(s.failedSources);
      next.add(id);
      return { failedSources: next };
    }),
  reset: () => set({ currentSourceId: null, currentEpisodeId: null, failedSources: new Set() }),
}));
