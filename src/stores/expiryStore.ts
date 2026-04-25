import { create } from "zustand";

export type ExpiryPreference = 7 | 14 | 30 | null; // null = never

interface ExpiryStore {
  defaultExpiry: ExpiryPreference;
  setDefaultExpiry: (days: ExpiryPreference) => void;
}

export const useExpiryStore = create<ExpiryStore>((set) => ({
  defaultExpiry: null,
  setDefaultExpiry: (days) => set({ defaultExpiry: days }),
}));
