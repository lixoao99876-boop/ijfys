"use client";

import { create } from "zustand";
import type { AuthUser } from "@/lib/auth";
import { me } from "@/lib/auth";

interface AuthState {
  user: AuthUser | null;
  loaded: boolean;
  refresh: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loaded: false,
  refresh: async () => {
    const u = await me();
    set({ user: u, loaded: true });
  },
  setUser: (u) => set({ user: u, loaded: true }),
}));
