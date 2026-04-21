// TODO: Replace SAMPLE_PALS with Supabase query:
// const { data } = await supabase.from('profiles').select('*')
//   .eq('onboarding_complete', true).neq('id', currentUser.id)

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BrandMark, Avatar, Button, Chip } from "@/components/ui";
import { semantic, colors, typography, spacing } from "@/theme/tokens";
import SAMPLE_PALS, { type Pal } from "@/data/samplePals";

const FILTERS = ["All", "Near me", "Philosophy", "Literature", "Travel", "Music"];

const REPLY_META: Record<Pal["replyStyle"], { icon: React.ComponentProps<typeof Feather>["name"]; label: string }> = {
  quick: { icon: "zap", label: "Quick replies" },
  thoughtful: { icon: "coffee", label: "Thoughtful pace" },
  deep: { icon: "moon", label: "Deep letters" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function Discover() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.headerTop}>
        <BrandMark size={22} />
        <View style={styles.headerActions}>
          <IconButton icon="bell" onPress={() => router.push("/notifications")} />
          <IconButton icon="sliders" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.headerText}>
        <Text style={styles.heading}>People writing today</Text>
        <Text style={styles.headingSub}>
          Matched to your interests &middot; Updated every few hours
        </Text>
      </View>

      {/* ── Filter chips ───────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={f}
            size="sm"
            selected={activeFilter === f}
            onPress={() => setActiveFilter(f)}
          />
        ))}
      </ScrollView>

      {/* ── Card list ──────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
      >
        {SAMPLE_PALS.map((pal) => (
          <MatchCard key={pal.id} pal={pal} router={router} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Icon Button ────────────────────────────────────────────────────────────

function IconButton({
  icon,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress}>
      <Feather name={icon} size={18} color={semantic.inkMuted} />
    </Pressable>
  );
}

// ─── Match Card ─────────────────────────────────────────────────────────────

function MatchCard({
  pal,
  router,
}: {
  pal: Pal;
  router: ReturnType<typeof useRouter>;
}) {
  const reply = REPLY_META[pal.replyStyle];
  const visibleInterests = pal.interests.slice(0, 3);
  const extraCount = pal.interests.length - 3;

  const openPalProfile = () =>
    router.push({
      pathname: "/pal/[id]",
      params: { id: pal.id, name: pal.name, hue: String(pal.hue) },
    });

  return (
    <View style={styles.card}>
      {/* Top row — avatar tappable to pal profile */}
      <View style={styles.cardTopRow}>
        <Pressable onPress={openPalProfile}>
          <Avatar name={pal.name} size="lg" hue={pal.hue} />
        </Pressable>
        {pal.isNew ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        ) : (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{pal.compatibility}% match</Text>
          </View>
        )}
      </View>

      {/* Name + location — tappable to pal profile */}
      <Pressable onPress={openPalProfile} style={styles.nameRow}>
        <Text style={styles.palName}>{pal.name}</Text>
        <Text style={styles.palLocation}>
          {pal.city} &middot; {pal.region}
        </Text>
      </Pressable>

      {/* Reply style pill */}
      <View style={styles.replyPill}>
        <Feather name={reply.icon} size={10} color={semantic.inkMuted} />
        <Text style={styles.replyPillText}>{reply.label}</Text>
      </View>

      {/* Bio */}
      <Text style={styles.bio}>{pal.bio}</Text>

      {/* Interest chips */}
      <View style={styles.interestRow}>
        {visibleInterests.map((interest) => (
          <View key={interest} style={styles.interestChip}>
            <Text style={styles.interestChipText}>{interest}</Text>
          </View>
        ))}
        {extraCount > 0 && (
          <View style={styles.interestChip}>
            <Text style={styles.interestChipText}>+{extraCount} more</Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom action row */}
      <View style={styles.actionRow}>
        <Text style={styles.lastActive}>Active {pal.lastActive}</Text>
        <View style={styles.actionBtns}>
          <Button variant="ghost" size="sm" onPress={() => {}}>
            Pass
          </Button>
          <Button
            size="sm"
            onPress={() =>
              router.push({
                pathname: "/chat/[id]",
                params: { id: pal.id, name: pal.name, hue: String(pal.hue) },
              })
            }
          >
            Write a letter →
          </Button>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantic.bg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing[2],
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing[4],
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    paddingHorizontal: spacing[5],
    marginTop: spacing[4],
  },
  heading: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    fontWeight: "400",
    color: semantic.ink,
  },
  headingSub: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkMuted,
    marginTop: spacing[1],
  },
  filterRow: {
    paddingLeft: spacing[5],
    paddingRight: spacing[2],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  cardList: {
    paddingTop: spacing[1],
    paddingBottom: spacing[8],
  },
  card: {
    backgroundColor: semantic.surface,
    borderRadius: spacing[5],
    marginHorizontal: spacing[5],
    marginBottom: 14,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: colors.paper[9],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchBadge: {
    backgroundColor: semantic.accentSoft,
    borderWidth: 1,
    borderColor: semantic.accentInk,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: spacing[1],
  },
  matchBadgeText: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.accentInk,
  },
  newBadge: {
    backgroundColor: colors.ocean[2],
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: spacing[1],
  },
  newBadgeText: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "600",
    color: colors.ocean[6],
  },
  nameRow: {
    marginTop: spacing[2],
    gap: 2,
  },
  palName: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.scale.md,
    fontWeight: "400",
    color: semantic.ink,
  },
  palLocation: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
  },
  replyPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing[1],
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 99,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    marginTop: spacing[2],
  },
  replyPillText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.xs,
    color: semantic.inkMuted,
  },
  bio: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.ink,
    lineHeight: 21,
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  interestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  interestChip: {
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 10,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  interestChipText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkMuted,
  },
  divider: {
    height: 1,
    backgroundColor: semantic.ruleSoft,
    marginVertical: spacing[3],
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastActive: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.xs,
    color: semantic.inkSoft,
  },
  actionBtns: {
    flexDirection: "row",
    gap: 10,
  },
});
