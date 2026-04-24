// ─── Trust signal one-off colors ────────────────────────────────────────────
// These are semantic-only (not in main tokens) because they exist solely to
// differentiate trust-signal categories. Listed here for documentation.
//
// Spec (OKLCH)            → hex approximation (React Native's color parser
//                           does not accept oklch()):
//   green bg  oklch(0.94 0.08 150) → #C3F5D8   (soft mint)
//   green fg  oklch(0.40 0.12 150) → #006141   (deep forest green)
//   amber bg  oklch(0.96 0.08 80)  → #F5EDBF   (pale warm cream)
//   amber fg  oklch(0.50 0.12 80)  → #866000   (mid warm amber)
//   blue      uses tokens: accentSoft bg, accentInk fg

export const TRUST_PALETTE = {
  green: { bg: "#C3F5D8", fg: "#006141" },
  amber: { bg: "#F5EDBF", fg: "#866000" },
} as const;

export type TrustColor = "green" | "blue" | "amber";

export type TrustSignal = {
  label: string;
  icon: string; // Feather icon name
  color: TrustColor;
};

export function getTrustSignals(profile: any): TrustSignal[] {
  const signals: TrustSignal[] = [];

  if (profile?.onboarding_complete) {
    signals.push({
      label: "Profile complete",
      icon: "check-circle",
      color: "green",
    });
  }
  if (profile?.interests?.length >= 3) {
    signals.push({ label: "Rich interests", icon: "star", color: "blue" });
  }
  if (profile?.bio) {
    signals.push({ label: "Has a bio", icon: "file-text", color: "blue" });
  }
  if (profile?.created_at) {
    const createdAt = new Date(profile.created_at);
    const daysSince =
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) {
      signals.push({ label: "New here", icon: "sunrise", color: "amber" });
    }
  }

  return signals.slice(0, 2);
}

// Sample fallbacks by pal id — used when real profile data isn't available
export const SAMPLE_TRUST_SIGNALS_BY_ID: Record<string, TrustSignal[]> = {
  "1": [
    { label: "Profile complete", icon: "check-circle", color: "green" },
    { label: "Has a bio", icon: "file-text", color: "blue" },
  ],
  "2": [
    { label: "New here", icon: "sunrise", color: "amber" },
    { label: "Profile complete", icon: "check-circle", color: "green" },
  ],
};

export const DEFAULT_SAMPLE_TRUST_SIGNALS: TrustSignal[] = [
  { label: "Profile complete", icon: "check-circle", color: "green" },
];
