import { Platform } from "react-native";

export const colors = {
  paper: {
    0: "#FBFAF6",
    1: "#F6F4EE",
    2: "#EDE9DF",
    3: "#DDD8CB",
    4: "#BFB9A8",
    5: "#968F7E",
    6: "#635D50",
    7: "#3D3930",
    8: "#211E18",
    9: "#130F0A",
  },
  ocean: {
    1: "#EAF3F6",
    2: "#C6DFE8",
    3: "#85B8CC",
    4: "#4E8FA6",
    5: "#3A7290",
    6: "#2A5568",
    7: "#1A3A4A",
  },
} as const;

export const semantic = {
  bg: colors.paper[0],
  surface: "#FDFBF6",
  surface2: colors.paper[1],
  surfaceSunk: colors.paper[2],

  ink: colors.paper[9],
  inkMuted: colors.paper[6],
  inkSoft: colors.paper[5],

  accent: colors.ocean[5],
  accentInk: colors.ocean[7],
  accentSoft: colors.ocean[1],
  accentFg: "#FDFBF6",

  rule: "#DEDAD0",
  ruleSoft: "#EDEADE",
} as const;

export const typography = {
  fontDisplay: "Georgia",
  fontBody: Platform.select({
    ios: "-apple-system",
    android: "Roboto",
    default: "System",
  })!,

  scale: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    "2xl": 30,
    "3xl": 38,
  },
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  "2xl": 32,
} as const;

const tokens = { colors, semantic, typography, spacing, radius } as const;
export default tokens;
