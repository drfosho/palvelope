import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { BrandMark, Button } from "@/components/ui";
import { semantic, typography, spacing, radius } from "@/theme/tokens";

const FEATURES = [
  {
    icon: (color: string) => (
      <Ionicons name="sparkles-outline" size={18} color={color} />
    ),
    text: "Matched by what you care about",
  },
  {
    icon: (color: string) => (
      <Feather name="shield" size={18} color={color} />
    ),
    text: "Anonymous or identified \u2014 your call",
  },
  {
    icon: (color: string) => (
      <Feather name="book-open" size={18} color={color} />
    ),
    text: "No feeds. No streaks. Just letters.",
  },
] as const;

export default function Welcome() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[semantic.bg, semantic.surface]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brandArea}>
            <BrandMark size={36} />
          </View>

          {/* Headline */}
          <Text style={styles.headline}>
            A letter is on its way{"\n"}
            <Text style={styles.headlineAccent}>from somewhere.</Text>
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Real people, real conversations. Quietly matched, thoughtfully
            written, always free.
          </Text>

          {/* Feature card */}
          <View style={styles.featureCard}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                {f.icon(semantic.accentInk)}
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <Button full size="lg" onPress={() => router.push("/(auth)/create")}>
            Begin writing
          </Button>
          <View style={styles.signInRow}>
            <Text style={styles.signInHint}>Already have a desk? </Text>
            <Pressable onPress={() => router.push("/(auth)/sign-in")}>
              <Text style={styles.signInLink}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing[6],
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  brandArea: {
    marginBottom: spacing[8],
    alignItems: "center",
  },
  headline: {
    fontFamily: typography.fontDisplay,
    fontSize: 32,
    fontWeight: "400",
    color: semantic.ink,
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 40,
  },
  headlineAccent: {
    fontStyle: "italic",
    color: semantic.accentInk,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    color: semantic.inkMuted,
    textAlign: "center",
    maxWidth: 300,
    alignSelf: "center",
    marginTop: spacing[4],
    lineHeight: 22,
  },
  featureCard: {
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.ruleSoft,
    borderRadius: spacing[4],
    padding: spacing[4],
    gap: 10,
    marginTop: spacing[6],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  featureText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.ink,
    flex: 1,
  },
  bottom: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInHint: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkSoft,
  },
  signInLink: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    fontWeight: "500",
    color: semantic.accentInk,
  },
});
