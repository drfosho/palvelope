import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { semantic, typography, radius, spacing } from "@/theme/tokens";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      style={[
        styles.container,
        selected ? styles.selected : styles.unselected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.label,
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
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
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
  label: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    fontWeight: "500",
  },
});
