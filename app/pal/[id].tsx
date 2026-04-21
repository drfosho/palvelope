import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Avatar, Button } from "@/components/ui";
import { semantic, colors, typography, spacing, radius } from "@/theme/tokens";
import SAMPLE_PALS, { type Pal } from "@/data/samplePals";

// ─── Config ─────────────────────────────────────────────────────────────────

const REPLY_META: Record<
  Pal["replyStyle"],
  {
    icon: React.ComponentProps<typeof Feather>["name"];
    label: string;
    description: string;
  }
> = {
  quick: {
    icon: "zap",
    label: "Quick back-and-forth",
    description: "Prefers short messages and fast back-and-forth",
  },
  thoughtful: {
    icon: "coffee",
    label: "Thoughtful pace",
    description: "Takes time to think. Replies with a few paragraphs.",
  },
  deep: {
    icon: "moon",
    label: "Deep letters",
    description: "Writes long-form letters. May take a day or two to reply.",
  },
};

const HEADER_HEIGHT = 64;

// ─── Component ──────────────────────────────────────────────────────────────

export default function PalProfile() {
  const { id, name, hue: hueParam } = useLocalSearchParams<{
    id: string;
    name?: string;
    hue?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const palHue = hueParam ? parseInt(hueParam, 10) : undefined;
  const pal = SAMPLE_PALS.find((p) => p.id === id);

  const palName = pal?.name ?? name ?? "Pal";
  const reply = REPLY_META[pal?.replyStyle ?? "thoughtful"];

  const navigateToChat = () =>
    router.push({
      pathname: "/chat/[id]",
      params: { id: id!, name: palName, hue: String(palHue ?? 0) },
    });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + HEADER_HEIGHT + spacing[6] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Avatar name={palName} size="xl" hue={palHue} />
          <Text style={styles.heroName}>{palName}</Text>

          {pal && (
            <View style={styles.heroLocation}>
              <Feather name="map-pin" size={12} color={semantic.inkSoft} />
              <Text style={styles.heroLocationText}>
                {pal.city} &middot; {pal.region}
              </Text>
            </View>
          )}

          {pal && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>
                {pal.compatibility}% match
              </Text>
            </View>
          )}
        </View>

        {/* ── About card ────────────────────────────────────────────── */}
        {pal && (
          <View style={styles.card}>
            <Text style={styles.bioText}>{pal.bio}</Text>
            <View style={styles.cardDivider} />
            <Text style={styles.monoLabel}>INTERESTS</Text>
            <View style={styles.chipGrid}>
              {pal.interests.map((interest) => (
                <View key={interest} style={styles.displayChip}>
                  <Text style={styles.displayChipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Writing style card ────────────────────────────────────── */}
        <View style={[styles.card, { marginTop: spacing[3] }]}>
          <Text style={styles.monoLabel}>WRITING STYLE</Text>
          <View style={styles.paceRow}>
            <Feather name={reply.icon} size={14} color={semantic.accentInk} />
            <Text style={styles.paceText}>{reply.label}</Text>
          </View>
          <View style={styles.cardDivider} />
          <Text style={styles.subLabel}>REPLY PACE</Text>
          <Text style={styles.paceDesc}>{reply.description}</Text>
        </View>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Feather name="lock" size={12} color={semantic.inkSoft} />
          <Text style={styles.footerText}>
            Conversations are end-to-end encrypted
          </Text>
        </View>
      </ScrollView>

      {/* ── Header (absolute, blur) ──────────────────────────────── */}
      <BlurView
        style={[styles.header, { paddingTop: insets.top }]}
        tint="light"
        intensity={60}
      >
        <View style={styles.headerInner}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
          </Pressable>
          <View style={styles.headerSpacer} />
          <View style={styles.headerActions}>
            <Button variant="ghost" size="sm" onPress={() => router.back()}>
              Pass
            </Button>
            <Button size="sm" onPress={navigateToChat}>
              Write a letter →
            </Button>
          </View>
        </View>
        <View style={styles.headerBorder} />
      </BlurView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.bg,
  },
  scroll: {
    paddingBottom: spacing[8],
  },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  headerBorder: {
    height: 1,
    backgroundColor: semantic.ruleSoft,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing[4],
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing[2],
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: spacing[6],
  },
  heroName: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    fontWeight: "400",
    color: semantic.ink,
    marginTop: spacing[3],
  },
  heroLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[1],
  },
  heroLocationText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkSoft,
  },
  matchBadge: {
    backgroundColor: semantic.accentSoft,
    borderWidth: 1,
    borderColor: semantic.accentInk,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: spacing[1],
    marginTop: spacing[2],
  },
  matchBadgeText: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.accentInk,
  },

  // Cards
  card: {
    backgroundColor: semantic.surface,
    borderRadius: spacing[5],
    marginHorizontal: spacing[5],
    marginTop: spacing[5],
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: colors.paper[9],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  bioText: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.scale.base,
    color: semantic.ink,
    lineHeight: 24,
  },
  cardDivider: {
    height: 1,
    backgroundColor: semantic.ruleSoft,
    marginVertical: 14,
  },
  monoLabel: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing[2],
  },
  displayChip: {
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 10,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  displayChipText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkMuted,
  },
  paceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  paceText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.ink,
  },
  subLabel: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
  },
  paceDesc: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkMuted,
    marginTop: spacing[1],
    lineHeight: 19,
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
    marginTop: spacing[5],
    marginBottom: spacing[8],
  },
  footerText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
  },
});
