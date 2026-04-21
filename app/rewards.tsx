import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import { semantic, colors, typography, spacing } from "@/theme/tokens";

// ─── One-off semantic color ─────────────────────────────────────────────────
const BOOST_GREEN = "#5CB065";
const BOOST_GREEN_BG = "#EDF7EE";

// ─── Boost definitions ──────────────────────────────────────────────────────

interface BoostOption {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
  adOption: boolean;
  creditCost: string;
}

const BOOST_OPTIONS: BoostOption[] = [
  {
    icon: "zap",
    title: "Discovery Boost",
    description: "Move to the top of Discover for 24 hours. More eyes on your profile.",
    adOption: true,
    creditCost: "1 credit",
  },
  {
    icon: "users",
    title: "Extra Match",
    description: "Get one additional match outside your usual filters. Great for discovering someone unexpected.",
    adOption: true,
    creditCost: "2 credits",
  },
  {
    icon: "check-circle",
    title: "Read Receipt (one-time)",
    description: "See when your last letter was opened. One conversation, one use.",
    adOption: false,
    creditCost: "1 credit",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function Rewards() {
  const router = useRouter();

  const placeholder = () => Alert.alert("Coming soon", "This feature is coming soon");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
          </Pressable>
          <Text style={styles.heading}>Boosts</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Intro card */}
        <View style={styles.introCard}>
          <View style={styles.introTop}>
            <Feather name="zap" size={24} color={semantic.accentInk} />
            <Text style={styles.introTitle}>Get more from Palvelope</Text>
          </View>
          <Text style={styles.introBody}>
            Boosts help you get more matches, stay visible longer, and unlock
            one-time perks — all optional. The core experience is always free.
          </Text>
        </View>

        {/* Active boosts */}
        <View style={styles.sectionWrap}>
          <Text style={styles.monoLabel}>YOUR BOOSTS</Text>
          <View style={styles.activeBoostCard}>
            <View style={styles.boostIconCircle}>
              <Feather name="zap" size={20} color={semantic.accentInk} />
            </View>
            <View style={styles.activeBoostText}>
              <Text style={styles.activeBoostTitle}>Discovery Boost</Text>
              <Text style={styles.activeBoostStatus}>
                Active — expires in 18 hours
              </Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Available boosts */}
        <View style={styles.sectionWrap}>
          <Text style={styles.monoLabel}>AVAILABLE BOOSTS</Text>
          {BOOST_OPTIONS.map((opt) => (
            <View key={opt.title} style={styles.boostOptionCard}>
              <View style={styles.boostOptionTop}>
                <View style={styles.boostOptionIcon}>
                  <Feather name={opt.icon} size={20} color={semantic.accentInk} />
                </View>
                <View style={styles.boostOptionInfo}>
                  <Text style={styles.boostOptionTitle}>{opt.title}</Text>
                  <Text style={styles.boostOptionDesc}>{opt.description}</Text>
                </View>
              </View>
              <View style={styles.boostOptionActions}>
                {opt.adOption && (
                  <>
                    <Button variant="ghost" size="sm" onPress={placeholder}>
                      Watch an ad
                    </Button>
                    <Text style={styles.orText}>or</Text>
                  </>
                )}
                <Button size="sm" onPress={placeholder}>
                  {opt.creditCost}
                </Button>
              </View>
            </View>
          ))}
        </View>

        {/* Credits */}
        <View style={styles.sectionWrap}>
          <Text style={styles.monoLabel}>YOUR CREDITS</Text>
          <View style={styles.creditsCard}>
            <Text style={styles.creditsValue}>0 credits</Text>
            <Button size="sm" onPress={placeholder}>
              Get credits
            </Button>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Credits are never required. All matches and messaging are free.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantic.bg,
  },
  scroll: {
    paddingBottom: spacing[8],
  },
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

  // Intro
  introCard: {
    backgroundColor: semantic.surface,
    borderRadius: spacing[5],
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
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
  introTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  introTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.scale.lg,
    color: semantic.ink,
  },
  introBody: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.inkMuted,
    lineHeight: 21,
    marginTop: spacing[2],
  },

  // Section
  sectionWrap: {
    marginTop: spacing[6],
    paddingHorizontal: spacing[5],
    gap: 10,
  },
  monoLabel: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  // Active boost
  activeBoostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: spacing[4],
    padding: spacing[4],
  },
  boostIconCircle: {
    width: 44,
    height: 44,
    borderRadius: spacing[3],
    backgroundColor: semantic.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBoostText: {
    flex: 1,
    gap: 2,
  },
  activeBoostTitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    fontWeight: "500",
    color: semantic.ink,
  },
  activeBoostStatus: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: BOOST_GREEN,
  },
  activePill: {
    backgroundColor: BOOST_GREEN_BG,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: spacing[1],
  },
  activePillText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: BOOST_GREEN,
    fontWeight: "500",
  },

  // Boost options
  boostOptionCard: {
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: spacing[4],
    padding: spacing[4],
  },
  boostOptionTop: {
    flexDirection: "row",
    gap: spacing[3],
  },
  boostOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: semantic.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  boostOptionInfo: {
    flex: 1,
    gap: spacing[1],
  },
  boostOptionTitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    fontWeight: "500",
    color: semantic.ink,
  },
  boostOptionDesc: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkMuted,
    lineHeight: 18,
  },
  boostOptionActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing[2],
    marginTop: spacing[3],
  },
  orText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
  },

  // Credits
  creditsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: spacing[4],
    padding: spacing[4],
  },
  creditsValue: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    color: semantic.ink,
  },

  // Footer
  footer: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkSoft,
    textAlign: "center",
    maxWidth: 260,
    alignSelf: "center",
    marginTop: spacing[5],
    marginBottom: spacing[8],
    lineHeight: 19,
  },
});
