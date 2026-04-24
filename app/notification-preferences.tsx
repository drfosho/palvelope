import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { semantic, typography, spacing } from "@/theme/tokens";
import {
  useNotificationStore,
  type NotificationPrefKey,
} from "@/stores/notificationStore";

// ─── Section config ─────────────────────────────────────────────────────────

interface PrefRow {
  key: NotificationPrefKey;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  subtitle: string;
}

interface PrefSection {
  title: string;
  rows: PrefRow[];
}

const SECTIONS: PrefSection[] = [
  {
    title: "LETTERS",
    rows: [
      {
        key: "newLetter",
        icon: "mail",
        label: "New letter received",
        subtitle: "When a pen pal sends you a message",
      },
      {
        key: "letterReplied",
        icon: "refresh-cw",
        label: "Letter replied to",
        subtitle: "When someone replies to your letter",
      },
    ],
  },
  {
    title: "MATCHES",
    rows: [
      {
        key: "newMatch",
        icon: "users",
        label: "New match suggested",
        subtitle: "When we find someone new for you",
      },
      {
        key: "matchAccepted",
        icon: "zap",
        label: "Match accepted your letter",
        subtitle: "When someone you wrote to accepts",
      },
    ],
  },
  {
    title: "REMINDERS",
    rows: [
      {
        key: "replyReminder",
        icon: "clock",
        label: "Gentle reply reminder",
        subtitle: "A nudge if a conversation goes quiet for a few days",
      },
      {
        key: "dailyBatch",
        icon: "calendar",
        label: "Daily batch ready",
        subtitle: "When your new daily matches are in",
      },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function NotificationPreferences() {
  const router = useRouter();
  const prefs = useNotificationStore();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
        </Pressable>
        <Text style={styles.heading}>Notifications</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro note */}
        <View style={styles.intro}>
          <Feather name="bell" size={14} color={semantic.accentInk} />
          <Text style={styles.introText}>
            Palvelope respects your attention. We only notify you when something
            genuinely needs it.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, idx) => (
          <View
            key={section.title}
            style={[styles.section, idx > 0 && styles.sectionSpaced]}
          >
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, i) => {
                const value = prefs[row.key];
                return (
                  <React.Fragment key={row.key}>
                    <View style={styles.row}>
                      <Feather
                        name={row.icon}
                        size={18}
                        color={semantic.accentInk}
                      />
                      <View style={styles.rowMid}>
                        <Text style={styles.rowLabel}>{row.label}</Text>
                        <Text style={styles.rowSub}>{row.subtitle}</Text>
                      </View>
                      <Switch
                        value={value}
                        onValueChange={(v) => prefs.setPreference(row.key, v)}
                        trackColor={{
                          true: semantic.accentInk,
                          false: semantic.rule,
                        }}
                        thumbColor={
                          Platform.OS === "android"
                            ? semantic.accentFg
                            : undefined
                        }
                      />
                    </View>
                    {i < section.rows.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
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
    fontSize: 22,
    fontWeight: "400",
    color: semantic.ink,
    textAlign: "center",
  },
  intro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: semantic.surface2,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 16,
  },
  introText: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    lineHeight: 13 * 1.5,
  },
  section: {
    marginTop: spacing[5],
  },
  sectionSpaced: {
    marginTop: 20,
  },
  sectionLabel: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingHorizontal: spacing[5],
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: semantic.surface,
    borderRadius: 16,
    marginHorizontal: spacing[5],
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  rowMid: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    color: semantic.ink,
  },
  rowSub: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkMuted,
    lineHeight: 12 * 1.4,
  },
  divider: {
    height: 1,
    backgroundColor: semantic.ruleSoft,
    marginLeft: 16 + 18 + 12,
  },
});
