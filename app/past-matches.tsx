import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BrandMark } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";

export default function PastMatches() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
        </Pressable>
        <Text style={styles.heading}>Past matches</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        <BrandMark size={28} />
        <Text style={styles.title}>Past matches coming soon</Text>
        <Text style={styles.subtitle}>
          You’ll be able to browse everyone you’ve passed on or written to.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: semantic.bg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing[4],
    backgroundColor: semantic.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    flex: 1,
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    fontWeight: "400",
    color: semantic.ink,
    textAlign: "center",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    color: semantic.ink,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.inkMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
