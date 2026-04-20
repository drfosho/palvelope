import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { semantic, typography } from "@/theme/tokens";

interface BrandMarkProps {
  size?: number;
}

export default function BrandMark({ size = 28 }: BrandMarkProps) {
  const fontSize = size * 0.85;

  return (
    <View style={styles.row}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z"
          stroke={semantic.accent}
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="m2 7 10 6 10-6"
          stroke={semantic.accent}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Text style={[styles.wordmark, { fontSize }]}>
        Pal
        <Text style={styles.italic}>velope</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wordmark: {
    fontFamily: typography.fontDisplay,
    fontWeight: "400",
    color: semantic.ink,
  },
  italic: {
    fontStyle: "italic",
  },
});
