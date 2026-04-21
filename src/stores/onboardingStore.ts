import { create } from "zustand";

export type AnonymityLevel = "anonymous" | "pen_name" | "open";
export type ReplyStyle = "quick" | "thoughtful" | "deep";

export interface OnboardingData {
  name: string;
  showLocation: boolean;
  interests: string[];
  anonymity: AnonymityLevel;
  replyStyle: ReplyStyle;
  homeRegion: string | null;
  targetRegions: string[];
}

interface OnboardingStore extends OnboardingData {
  setName: (name: string) => void;
  setShowLocation: (show: boolean) => void;
  setInterests: (interests: string[]) => void;
  setAnonymity: (level: AnonymityLevel) => void;
  setReplyStyle: (style: ReplyStyle) => void;
  setHomeRegion: (region: string) => void;
  setTargetRegions: (regions: string[]) => void;
  getData: () => OnboardingData;
  reset: () => void;
}

const initialState: OnboardingData = {
  name: "",
  showLocation: false,
  interests: [],
  anonymity: "pen_name",
  replyStyle: "thoughtful",
  homeRegion: null,
  targetRegions: ["Anywhere"],
};

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  ...initialState,
  setName: (name) => set({ name }),
  setShowLocation: (showLocation) => set({ showLocation }),
  setInterests: (interests) => set({ interests }),
  setAnonymity: (anonymity) => set({ anonymity }),
  setReplyStyle: (replyStyle) => set({ replyStyle }),
  setHomeRegion: (homeRegion) => set({ homeRegion }),
  setTargetRegions: (targetRegions) => set({ targetRegions }),
  getData: () => {
    const { name, showLocation, interests, anonymity, replyStyle, homeRegion, targetRegions } = get();
    return { name, showLocation, interests, anonymity, replyStyle, homeRegion, targetRegions };
  },
  reset: () => set(initialState),
}));
