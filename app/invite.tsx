import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Animated,
  Share,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";
import { supabase } from "@/lib/supabase";

const REVOKE_RED = "#B4402A"; // ≈ oklch(0.55 0.18 25)

interface Invite {
  id: string;
  inviter_id: string;
  code: string;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  status: "pending" | "accepted" | "expired";
}

const MAX_TRUSTED = 5;

// ─── Animated envelope ──────────────────────────────────────────────────────

const ENVELOPE_STROKE = "#3A7290"; // ocean-5

function AnimatedEnvelope() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -8,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [floatAnim, fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
      }}
    >
      <Svg width={100} height={100} viewBox="0 0 24 24" fill="none">
        <Path
          d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z"
          stroke={ENVELOPE_STROKE}
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="m2 7 10 6 10-6"
          stroke={ENVELOPE_STROKE}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatExpiry(expiresAtIso: string): string {
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const minutes = Math.max(1, Math.floor(ms / (1000 * 60)));
  return `Expires in ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InviteScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeInvite, setActiveInvite] = useState<Invite | null>(null);
  const [trustedCount, setTrustedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, []);
  // touch `now` so the linter doesn't strip it — used to recompute formatExpiry
  void now;

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      // Existing pending invite
      const { data: pending } = await supabase
        .from("invites")
        .select("*")
        .eq("inviter_id", uid)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (pending) setActiveInvite(pending as Invite);

      // Trusted-connection count
      const { count } = await supabase
        .from("trusted_connections")
        .select("*", { count: "exact", head: true })
        .or(`user_1.eq.${uid},user_2.eq.${uid}`);
      if (typeof count === "number") setTrustedCount(count);

      setLoading(false);
    };
    load();
  }, []);

  const handleGenerate = async () => {
    if (!userId) return;
    setGenerating(true);
    const { data, error } = await supabase
      .from("invites")
      .insert({ inviter_id: userId })
      .select()
      .single();
    setGenerating(false);
    if (error) {
      console.error("[invite] insert error:", error);
      Alert.alert("Couldn’t create invitation", error.message);
      return;
    }
    if (data) setActiveInvite(data as Invite);
  };

  const handleShare = async () => {
    if (!activeInvite) return;
    try {
      await Share.share({
        message: `I’d like to correspond with you on Palvelope. Use this code to join: ${activeInvite.code}\n\npalvelope.com/join`,
      });
    } catch (e) {
      console.warn("[invite] share failed:", e);
    }
  };

  const handleCopy = async () => {
    if (!activeInvite) return;
    await Clipboard.setStringAsync(activeInvite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRevoke = () => {
    if (!activeInvite) return;
    Alert.alert(
      "Revoke invitation?",
      "The code will no longer work. You can generate a new one at any time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("invites")
              .delete()
              .eq("id", activeInvite.id);
            if (error) {
              Alert.alert("Couldn’t revoke", error.message);
              return;
            }
            setActiveInvite(null);
          },
        },
      ]
    );
  };

  const remaining = Math.max(0, MAX_TRUSTED - trustedCount);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
        </Pressable>
        <Text style={styles.heading}>Trusted circle</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <AnimatedEnvelope />
          <Text style={styles.heroTitle}>Send a letter before they arrive.</Text>
          <Text style={styles.heroSubtitle}>
            A private invitation for someone you actually want to hear from.
            Not the algorithm’s choice — yours.
          </Text>

          {/* Capacity */}
          <View style={styles.capacityRow}>
            {Array.from({ length: MAX_TRUSTED }).map((_, i) => {
              const filled = i < trustedCount;
              return (
                <View
                  key={i}
                  style={[
                    styles.capacityDot,
                    filled ? styles.capacityDotFilled : styles.capacityDotEmpty,
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.capacityLabel}>
            {trustedCount} of {MAX_TRUSTED} trusted connections used
          </Text>
        </View>

        {/* Generate / active card */}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={semantic.accentInk} />
          </View>
        ) : activeInvite ? (
          <View style={styles.activeCard}>
            <Text style={styles.activeTitle}>Your invitation is ready</Text>
            <Text style={styles.activeSubtitle}>
              Share this with someone you’d like to write to.
            </Text>

            <View style={styles.codeWrap}>
              <Text style={styles.codeText}>{activeInvite.code}</Text>
            </View>

            <View style={styles.expiryRow}>
              <Feather name="clock" size={12} color={semantic.inkSoft} />
              <Text style={styles.expiryText}>
                {formatExpiry(activeInvite.expires_at)}
              </Text>
            </View>

            <View style={styles.shareRow}>
              <View style={styles.shareBtnFlex}>
                <Button full onPress={handleShare}>
                  Share invite
                </Button>
              </View>
              <Button variant="ghost" onPress={handleCopy}>
                {copied ? "Copied!" : "Copy code"}
              </Button>
            </View>

            <Pressable onPress={handleRevoke} style={styles.revokeRow}>
              <Text style={styles.revokeText}>Revoke this invitation</Text>
            </Pressable>
          </View>
        ) : remaining === 0 ? (
          <View style={styles.fullCircleNote}>
            <Text style={styles.fullCircleText}>
              Your trusted circle is full ({MAX_TRUSTED}/{MAX_TRUSTED}).
            </Text>
          </View>
        ) : (
          <View style={styles.generateWrap}>
            <Button
              full
              disabled={generating}
              onPress={handleGenerate}
            >
              {generating ? "Sealing…" : "Seal a letter of invitation →"}
            </Button>
          </View>
        )}

        {/* Rules */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesLabel}>HOW TRUSTED CIRCLE WORKS</Text>
          <RuleRow text="One invitation per person — they’re personal, not shareable" />
          <RuleRow text="Expires in 48 hours if unused" />
          <RuleRow text="You can have up to 5 trusted connections" />
          <RuleRow text="Your pen pals from the algorithm stay completely separate" />
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RuleRow({ text }: { text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Feather name="check" size={14} color={semantic.accentInk} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: semantic.bg },
  scroll: { paddingBottom: spacing[4] },
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
    fontSize: 20,
    fontWeight: "400",
    color: semantic.ink,
    textAlign: "center",
  },

  hero: {
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  heroTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    color: semantic.ink,
    textAlign: "center",
    marginTop: spacing[5],
  },
  heroSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.inkMuted,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
    lineHeight: 14 * 1.6,
  },

  capacityRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  capacityDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  capacityDotFilled: {
    backgroundColor: semantic.accentInk,
  },
  capacityDotEmpty: {
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
  },
  capacityLabel: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
    marginTop: 8,
  },

  loaderWrap: {
    alignItems: "center",
    marginTop: 32,
  },

  generateWrap: {
    marginTop: 32,
    marginHorizontal: 20,
  },

  fullCircleNote: {
    marginTop: 32,
    marginHorizontal: 20,
    backgroundColor: semantic.surface2,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  fullCircleText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    textAlign: "center",
  },

  activeCard: {
    backgroundColor: semantic.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 32,
    marginHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#130F0A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  activeTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    color: semantic.ink,
  },
  activeSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    marginTop: 4,
  },
  codeWrap: {
    backgroundColor: semantic.surface2,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: semantic.accentInk,
    padding: 16,
    marginTop: 16,
    alignItems: "center",
  },
  codeText: {
    fontFamily: typography.fontDisplay,
    fontSize: 36,
    color: semantic.accentInk,
    letterSpacing: 36 * 0.08,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  expiryText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
  },
  shareRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    alignItems: "center",
  },
  shareBtnFlex: {
    flex: 1,
  },
  revokeRow: {
    alignSelf: "center",
    marginTop: 12,
    paddingVertical: 4,
  },
  revokeText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: REVOKE_RED,
  },

  rulesCard: {
    backgroundColor: semantic.surface2,
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
    marginHorizontal: 20,
    gap: 8,
  },
  rulesLabel: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  ruleText: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    lineHeight: 13 * 1.5,
  },
});
