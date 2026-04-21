import React from "react";
import { Pressable, Text, StyleSheet, type ViewStyle, type TextStyle } from "react-native";
import { semantic, typography, radius, spacing } from "@/theme/tokens";

type ChipSize = "sm" | "md";

interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  size?: ChipSize;
  onPress?: () => void;
}

const padH: Record<ChipSize, number> = { sm: spacing[2], md: spacing[3] };
const padV: Record<ChipSize, number> = { sm: spacing[1], md: spacing[1] + 2 };
const fonts: Record<ChipSize, number> = { sm: typography.scale.xs, md: typography.scale.sm };

export default function Chip({ label, selected = false, disabled = false, size = "md", onPress }: ChipProps) {
  const sizeStyle: ViewStyle = {
    paddingHorizontal: padH[size],
    paddingVertical: padV[size],
  };

  const textSize: TextStyle = {
    fontSize: fonts[size],
  };

  return (
    <Pressable
      style={[
        styles.container,
        sizeStyle,
        selected ? styles.selected : styles.unselected,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.label,
          textSize,
          { color: selected ? semantic.accentInk : semantic.inkMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius["2xl"],
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  selected: {
    backgroundColor: semantic.accentSoft,
    borderColor: semantic.accent,
  },
  unselected: {
    backgroundColor: semantic.surface2,
    borderColor: semantic.rule,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: typography.fontBody,
    fontWeight: "500",
  },
});
