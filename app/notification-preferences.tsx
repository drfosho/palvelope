import React, { useState } from "react";
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
import {
  useExpiryStore,
  type ExpiryPreference,
} from "@/stores/expiryStore";

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

interface ExpiryOption {
  value: ExpiryPreference;
  label: string;
  isDefault?: boolean;
}

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { value: null, label: "Never — letters stay open", isDefault: true },
  { value: 30, label: "Archive after 30 days — for slow writers" },
  { value: 14, label: "Archive after 14 days" },
  { value: 7, label: "Archive after 7 days — for quick exchanges" },
];

function expiryDisplay(value: ExpiryPreference): string {
  if (value === null) return "Never";
  return `${value} days`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function NotificationPreferences() {
  const router = useRouter();
  const prefs = useNotificationStore();
  const { defaultExpiry, setDefaultExpiry } = useExpiryStore();
  const [expiryOpen, setExpiryOpen] = useState(false);

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

        {/* Letter expiry section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LETTER EXPIRY</Text>
          <View style={styles.expiryCard}>
            <Pressable
              style={styles.expiryHeader}
              onPress={() => setExpiryOpen((v) => !v)}
            >
              <Feather name="clock" size={18} color={semantic.accentInk} />
              <Text style={styles.expiryHeaderLabel}>Auto-archive after</Text>
              <Text style={styles.expiryHeaderValue}>
                {expiryDisplay(defaultExpiry)}
              </Text>
              <Feather
                name={expiryOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={semantic.inkSoft}
              />
            </Pressable>

            {expiryOpen && (
              <View style={styles.expiryOptionList}>
                {EXPIRY_OPTIONS.map((opt) => {
                  const selected = defaultExpiry === opt.value;
                  return (
                    <Pressable
                      key={String(opt.value)}
                      style={styles.expiryOption}
                      onPress={() => setDefaultExpiry(opt.value)}
                    >
                      <View style={styles.expiryOptionMid}>
                        <View style={styles.expiryOptionLabelRow}>
                          <Text style={styles.expiryOptionLabel}>
                            {opt.label}
                          </Text>
                          {opt.isDefault && (
                            <View style={styles.recommendedTag}>
                              <Text style={styles.recommendedTagText}>
                                Default
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {selected ? (
                        <Feather
                          name="check"
                          size={16}
                          color={semantic.accentInk}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
          <Text style={styles.expiryFooter}>
            Letters stay open until you choose to close them. Enable
            auto-archive if you prefer a quieter inbox.
          </Text>
        </View>

        {/* Notification sections */}
        {SECTIONS.map((section) => (
          <View
            key={section.title}
            style={[styles.section, styles.sectionSpaced]}
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

  // Expiry card
  expiryCard: {
    backgroundColor: semantic.surface,
    borderRadius: 16,
    marginHorizontal: spacing[5],
    borderWidth: 1,
    borderColor: semantic.rule,
    overflow: "hidden",
  },
  expiryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  expiryHeaderLabel: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 15,
    color: semantic.ink,
  },
  expiryHeaderValue: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    fontWeight: "500",
    color: semantic.accentInk,
    marginRight: spacing[2],
  },
  expiryOptionList: {
    borderTopWidth: 1,
    borderTopColor: semantic.ruleSoft,
  },
  expiryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  expiryOptionMid: {
    flex: 1,
    gap: 2,
  },
  expiryOptionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expiryOptionLabel: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.ink,
    fontWeight: "500",
  },
  recommendedTag: {
    backgroundColor: semantic.accentSoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recommendedTagText: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    color: semantic.accentInk,
    fontWeight: "500",
  },
  expiryFooter: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
    paddingHorizontal: spacing[5],
    marginTop: spacing[2],
    lineHeight: 12 * 1.4,
  },
});
