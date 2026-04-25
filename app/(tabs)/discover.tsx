import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BrandMark, Avatar, Button, Chip } from "@/components/ui";
import { semantic, colors, typography, spacing } from "@/theme/tokens";
import SAMPLE_PALS from "@/data/samplePals";
import {
  supabase,
  getTodaysMatches,
  updateMatchStatus,
} from "@/lib/supabase";
import {
  getTrustSignals,
  SAMPLE_TRUST_SIGNALS_BY_ID,
  DEFAULT_SAMPLE_TRUST_SIGNALS,
  TRUST_PALETTE,
  type TrustSignal,
  type TrustColor,
} from "@/lib/trustSignals";

// ─── Types ──────────────────────────────────────────────────────────────────

type ReplyStyle = "quick" | "thoughtful" | "deep";

type DisplayMatch = {
  matchId: string | null;
  profileId: string;
  name: string;
  region: string;
  city: string;
  hue: number;
  interests: string[];
  replyStyle: ReplyStyle;
  compatibility: number;
  isNew: boolean;
  lastActive: string;
  bio: string;
  createdAt: string;
  trustSignals: TrustSignal[];
};

type SortMode = "best" | "new";

const REPLY_META: Record<
  ReplyStyle,
  { icon: React.ComponentProps<typeof Feather>["name"]; label: string }
> = {
  quick: { icon: "zap", label: "Quick replies" },
  thoughtful: { icon: "coffee", label: "Thoughtful pace" },
  deep: { icon: "moon", label: "Deep letters" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function hueFromId(id: string): number {
  return ((id.charCodeAt(0) || 0) + (id.charCodeAt(1) || 0)) % 360;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function normalizeRealMatch(match: any): DisplayMatch {
  const p = match.matched_profile ?? {};
  const profileId: string = p.id ?? "";
  return {
    matchId: match.id,
    profileId,
    name: p.display_name ?? "Anonymous",
    region: p.home_region ?? "Somewhere",
    city: "",
    hue: hueFromId(profileId),
    interests: p.interests ?? [],
    replyStyle: (p.reply_style as ReplyStyle) ?? "thoughtful",
    compatibility: match.compatibility_score ?? 0,
    isNew: match.batch_date === todayString(),
    lastActive: "",
    bio: p.bio ?? "",
    createdAt: p.created_at ?? new Date().toISOString(),
    trustSignals: getTrustSignals(p),
  };
}

function sampleFallback(): DisplayMatch[] {
  const nowIso = new Date().toISOString();
  return SAMPLE_PALS.map((pal) => ({
    matchId: null,
    profileId: pal.id,
    name: pal.name,
    region: pal.region,
    city: pal.city,
    hue: pal.hue,
    interests: pal.interests,
    replyStyle: pal.replyStyle,
    compatibility: pal.compatibility,
    isNew: pal.isNew,
    lastActive: pal.lastActive,
    bio: pal.bio,
    createdAt: nowIso,
    trustSignals:
      SAMPLE_TRUST_SIGNALS_BY_ID[pal.id] ?? DEFAULT_SAMPLE_TRUST_SIGNALS,
  }));
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Discover() {
  const router = useRouter();
  const [matches, setMatches] = useState<DisplayMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const fadeAnimsRef = useRef<Record<string, Animated.Value>>({});

  const getFadeAnim = (displayId: string): Animated.Value => {
    if (!fadeAnimsRef.current[displayId]) {
      fadeAnimsRef.current[displayId] = new Animated.Value(1);
    }
    return fadeAnimsRef.current[displayId];
  };

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setMatches(sampleFallback());
        setUsingSampleData(true);
        setLoading(false);
        return;
      }

      setCurrentUser(session.user);

      const todaysMatches = await getTodaysMatches(session.user.id);
      console.log(
        "[Discover] raw matches from DB:",
        JSON.stringify(todaysMatches, null, 2)
      );
      console.log("[Discover] match count:", todaysMatches.length);

      if (todaysMatches.length > 0) {
        setMatches(todaysMatches.map(normalizeRealMatch));
        setUsingSampleData(false);
      } else {
        const { error } = await supabase.rpc("generate_daily_matches", {
          target_user_id: session.user.id,
        });
        console.log("[Discover] RPC error:", error);
        if (!error) {
          const fresh = await getTodaysMatches(session.user.id);
          console.log("[Discover] post-RPC match count:", fresh.length);
          setMatches(fresh.map(normalizeRealMatch));
          setUsingSampleData(false);
        } else {
          setMatches(sampleFallback());
          setUsingSampleData(true);
        }
      }
    } catch (e) {
      console.error("loadMatches error:", e);
      setMatches(sampleFallback());
      setUsingSampleData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // ── Sort ────────────────────────────────────────────────────────────────
  const sortedMatches = [...matches].sort((a, b) => {
    if (sortMode === "best") return b.compatibility - a.compatibility;
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  // ── Pass / accept ───────────────────────────────────────────────────────
  const handlePass = async (
    matchId: string | null | undefined,
    displayId: string
  ) => {
    console.log("[discover] handlePass matchId:", matchId, "displayId:", displayId);
    // Always remove from UI immediately
    Animated.timing(getFadeAnim(displayId), {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMatches((prev) => prev.filter((m) => m.profileId !== displayId));
    });
    // Update DB if we have a real matchId
    if (matchId) {
      try {
        await updateMatchStatus(matchId, "passed");
      } catch (e) {
        console.warn("updateMatchStatus passed failed:", e);
      }
    }
  };

  const handleWrite = async (match: DisplayMatch) => {
    if (match.matchId) {
      updateMatchStatus(match.matchId, "accepted").catch((e) =>
        console.warn("updateMatchStatus accepted failed:", e)
      );
    }
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: match.profileId,
        name: match.name,
        hue: String(match.hue),
      },
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────

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
          Matched to your interests &middot; A small, curated batch
        </Text>
      </View>

      {/* ── Sort toggle ────────────────────────────────────────────── */}
      <View style={styles.sortRow}>
        <Chip
          label="Best match"
          size="sm"
          selected={sortMode === "best"}
          onPress={() => setSortMode("best")}
        />
        <Chip
          label="Newest first"
          size="sm"
          selected={sortMode === "new"}
          onPress={() => setSortMode("new")}
        />
      </View>

      {usingSampleData && !loading && (
        <Text style={styles.sampleNote}>showing sample profiles</Text>
      )}

      {/* ── Body ───────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={semantic.accentInk} />
        </View>
      ) : matches.length === 0 ? (
        <EmptyState onRefresh={loadMatches} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.cardList}
          showsVerticalScrollIndicator={false}
        >
          {/* Batch header */}
          <View style={styles.batchHeader}>
            <Feather name="star" size={14} color={semantic.accentInk} />
            <Text style={styles.batchHeaderText}>
              Your {sortedMatches.length} matches for today
            </Text>
            <Text style={styles.batchHeaderRight}>Refreshes daily</Text>
          </View>

          {sortedMatches.map((match) => (
            <MatchCard
              key={match.profileId}
              match={match}
              opacity={getFadeAnim(match.profileId)}
              onPass={() => handlePass(match.matchId, match.profileId)}
              onWrite={() => handleWrite(match)}
              onOpenProfile={() =>
                router.push({
                  pathname: "/pal/[id]",
                  params: {
                    id: match.profileId,
                    name: match.name,
                    hue: String(match.hue),
                  },
                })
              }
            />
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>That’s everyone for today.</Text>
            <Text style={styles.footerSub}>
              Come back tomorrow for a fresh batch.
            </Text>
            <View style={styles.footerBtn}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => router.push("/past-matches")}
              >
                Browse past matches
              </Button>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <BrandMark size={28} />
      <Text style={styles.emptyTitle}>Your matches are on their way.</Text>
      <Text style={styles.emptySub}>
        We find people based on your interests and pace. Check back soon — or
        invite a friend.
      </Text>
      <View style={styles.emptyBtn}>
        <Button onPress={onRefresh}>Refresh</Button>
      </View>
    </View>
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

// ─── Trust signal pill ──────────────────────────────────────────────────────

function TrustPill({ signal }: { signal: TrustSignal }) {
  const palette = trustPillPalette(signal.color);
  return (
    <View style={[styles.trustPill, { backgroundColor: palette.bg }]}>
      <Feather
        name={signal.icon as React.ComponentProps<typeof Feather>["name"]}
        size={10}
        color={palette.fg}
      />
      <Text style={[styles.trustPillText, { color: palette.fg }]}>
        {signal.label}
      </Text>
    </View>
  );
}

function trustPillPalette(color: TrustColor): { bg: string; fg: string } {
  if (color === "blue") {
    return { bg: semantic.accentSoft, fg: semantic.accentInk };
  }
  return TRUST_PALETTE[color];
}

// ─── Match Card ─────────────────────────────────────────────────────────────

function MatchCard({
  match,
  opacity,
  onPass,
  onWrite,
  onOpenProfile,
}: {
  match: DisplayMatch;
  opacity: Animated.Value;
  onPass: () => void;
  onWrite: () => void;
  onOpenProfile: () => void;
}) {
  const reply = REPLY_META[match.replyStyle];
  const visibleInterests = match.interests.slice(0, 3);
  const extraCount = match.interests.length - 3;

  const location = match.city
    ? `${match.city} · ${match.region}`
    : match.region;

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Top row */}
      <View style={styles.cardTopRow}>
        <Pressable onPress={onOpenProfile}>
          <Avatar name={match.name} size="lg" hue={match.hue} />
        </Pressable>
        {match.isNew ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        ) : (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>
              {match.compatibility}% match
            </Text>
          </View>
        )}
      </View>

      {/* Name + location */}
      <Pressable onPress={onOpenProfile} style={styles.nameRow}>
        <Text style={styles.palName}>{match.name}</Text>
        <Text style={styles.palLocation}>{location}</Text>
      </Pressable>

      {/* Reply style pill */}
      <View style={styles.replyPill}>
        <Feather name={reply.icon} size={10} color={semantic.inkMuted} />
        <Text style={styles.replyPillText}>{reply.label}</Text>
      </View>

      {/* Trust signals */}
      {match.trustSignals.length > 0 && (
        <View style={styles.trustRow}>
          {match.trustSignals.map((s) => (
            <TrustPill key={s.label} signal={s} />
          ))}
        </View>
      )}

      {/* Bio */}
      {match.bio ? <Text style={styles.bio}>{match.bio}</Text> : null}

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
        <Text style={styles.lastActive}>
          {match.lastActive ? `Active ${match.lastActive}` : ""}
        </Text>
        <View style={styles.actionBtns}>
          <Button variant="ghost" size="sm" onPress={onPass}>
            Pass
          </Button>
          <Button size="sm" onPress={onWrite}>
            Write a letter →
          </Button>
        </View>
      </View>
    </Animated.View>
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

  sortRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  sampleNote: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
    textAlign: "center",
    marginTop: spacing[2],
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: spacing[6],
  },
  emptyTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    color: semantic.ink,
    marginTop: spacing[4],
    textAlign: "center",
  },
  emptySub: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.inkMuted,
    marginTop: 8,
    maxWidth: 260,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 20,
  },

  // Card list
  cardList: {
    paddingTop: spacing[1],
    paddingBottom: spacing[8],
  },

  // Batch header
  batchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: semantic.surface2,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    marginHorizontal: 20,
  },
  batchHeaderText: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.ink,
  },
  batchHeaderRight: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: semantic.inkSoft,
  },

  // Card
  card: {
    backgroundColor: semantic.surface,
    borderRadius: spacing[5],
    marginHorizontal: spacing[5],
    marginTop: 14,
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

  // Trust signals
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing[2],
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trustPillText: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    fontWeight: "500",
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

  // Batch footer
  footer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
    paddingHorizontal: spacing[6],
  },
  footerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    color: semantic.inkMuted,
    textAlign: "center",
  },
  footerSub: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkSoft,
    marginTop: 6,
    textAlign: "center",
  },
  footerBtn: {
    marginTop: 16,
  },
});
