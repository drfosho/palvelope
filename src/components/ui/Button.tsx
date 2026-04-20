import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { semantic, typography, radius, spacing } from "@/theme/tokens";

type Variant = "primary" | "ghost";
type Size = "md" | "lg";

interface ButtonProps {
  children: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

const heights: Record<Size, number> = { md: 44, lg: 52 };
const fontSizes: Record<Size, number> = { md: typography.scale.base, lg: typography.scale.md };

export default function Button({
  children,
  variant = "primary",
  size = "md",
  full = false,
  disabled = false,
  onPress,
}: ButtonProps) {
  const isPrimary = variant === "primary";

  const containerStyle: ViewStyle = {
    height: heights[size],
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isPrimary ? semantic.accent : "transparent",
    borderWidth: isPrimary ? 0 : 1.5,
    borderColor: isPrimary ? undefined : semantic.accent,
    opacity: disabled ? 0.4 : 1,
    ...(full ? { width: "100%" as unknown as number } : {}),
  };

  const textStyle: TextStyle = {
    fontFamily: typography.fontBody,
    fontSize: fontSizes[size],
    fontWeight: "600",
    color: isPrimary ? semantic.accentFg : semantic.accent,
  };

  return (
    <Pressable
      style={({ pressed }) => [
        containerStyle,
        pressed && !disabled && styles.pressed,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={textStyle}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
});
