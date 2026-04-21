import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { typography } from "@/theme/tokens";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  hue?: number;
}

const dimensions: Record<AvatarSize, number> = { sm: 28, md: 36, lg: 48, xl: 64 };
const fontSizes: Record<AvatarSize, number> = { sm: 12, md: 14, lg: 19, xl: 26 };

function deterministicHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export default function Avatar({ name, size = "md", hue: hueOverride }: AvatarProps) {
  const dim = dimensions[size];
  const hue = hueOverride ?? deterministicHue(name);
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.circle,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: `hsl(${hue}, 45%, 72%)`,
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          {
            fontSize: fontSizes[size],
            color: `hsl(${hue}, 50%, 28%)`,
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: typography.fontDisplay,
    fontWeight: "600",
  },
});
