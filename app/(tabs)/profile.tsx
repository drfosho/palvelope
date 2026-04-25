import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Avatar, Button } from "@/components/ui";
import { semantic, colors, typography, spacing } from "@/theme/tokens";
import {
  supabase,
  getProfile,
  updateProfile,
  type Profile,
} from "@/lib/supabase";

// ─── Config ─────────────────────────────────────────────────────────────────

type AnonymityLevel = "anonymous" | "pen_name" | "open";
type ReplyStyle = "quick" | "thoughtful" | "deep";

const ANONYMITY_META: Record<
  AnonymityLevel,
  { icon: React.ComponentProps<typeof Feather>["name"]; label: string }
> = {
  anonymous: { icon: "eye-off", label: "Anonymous" },
  pen_name: { icon: "user", label: "Pen name" },
  open: { icon: "eye", label: "Open profile" },
};

const REPLY_META: Record<
  ReplyStyle,
  { icon: React.ComponentProps<typeof Feather>["name"]; label: string }
> = {
  quick: { icon: "zap", label: "Quick back-and-forth" },
  thoughtful: { icon: "coffee", label: "Thoughtful pace" },
  deep: { icon: "moon", label: "Deep letters" },
};

interface AccountRow {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  route?: string;
}

const ACCOUNT_ROWS: AccountRow[] = [
  { icon: "mail", label: "Email & notifications", route: "/notification-preferences" },
  // TRUSTED CIRCLE — hidden at launch, re-enable when positioning is right
  // { icon: "gift", label: "Invite someone you trust", route: "/invite" },
  { icon: "lock", label: "Privacy settings" },
  { icon: "shield", label: "Safety & blocking" },
  { icon: "help-circle", label: "Help & feedback" },
];

// ─── Profile completeness ──────────────────────────────────────────────────

function getCompleteness(profile: Profile | null): {
  score: number;
  missing: string[];
} {
  if (!profile) return { score: 0, missing: [] };
  const checks = [
    { label: "Add your name", done: !!profile.display_name },
    { label: "Write a bio", done: !!profile.bio },
    {
      label: "Pick interests",
      done: !!profile.interests && profile.interests.length >= 2,
    },
    { label: "Set your region", done: !!profile.home_region },
    { label: "Choose writing pace", done: !!profile.reply_style },
  ];
  const done = checks.filter((c) => c.done).length;
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingBio, setEditingBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const data = await getProfile(user.id);
      setProfile(data);
      setLoading(false);
    };
    loadProfile();
  }, []);

  const displayName = profile?.display_name || "Your Desk";
  const anonymity = (profile?.anonymity_level ?? "pen_name") as AnonymityLevel;
  const replyStyle = (profile?.reply_style ?? "thoughtful") as ReplyStyle;
  const anonMeta = ANONYMITY_META[anonymity];
  const replyMeta = REPLY_META[replyStyle];
  const interests = profile?.interests ?? [];
  const showLocation = profile?.show_location ?? false;
  const homeRegion = profile?.home_region;
  const bio = profile?.bio;

  const handleSignOut = () => {
    Alert.alert(
      "Sign out?",
      "You’ll need to sign in again to access your letters.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/(auth)/welcome");
          },
        },
      ]
    );
  };

  // ── Completeness ─────────────────────────────────────────────────────────
  const { score: completenessScore, missing: completenessMissing } =
    getCompleteness(profile);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completenessScore,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [completenessScore, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const enterEdit = () => {
    setEditingName(profile?.display_name ?? "");
    setEditingBio(profile?.bio ?? "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingName("");
    setEditingBio("");
  };

  const saveEdit = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await updateProfile({
      id: profile.id,
      display_name: editingName.trim() || null,
      bio: editingBio.trim() || null,
    });
    if (error) {
      console.error("[profile] save failed:", error);
      Alert.alert("Couldn’t save", error.message);
      setSaving(false);
      return;
    }
    const fresh = await getProfile(profile.id);
    setProfile(fresh);
    setSaving(false);
    setIsEditing(false);
  };

  const handleAvatarPress = () => {
    // TODO: integrate expo-image-picker for real photo upload,
    // then upload to Supabase Storage and store the URL on profile.avatar_url.
    Alert.alert(
      "Photo upload coming soon",
      "We’ll add this in a future update."
    );
  };

  const handleAccountRowPress = (row: AccountRow) => {
    if (row.route) {
      router.push(row.route as any);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={semantic.accentInk} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Your desk</Text>
          <View style={styles.headerBtns}>
            {!isEditing && (
              <Pressable
                style={styles.iconBtn}
                onPress={enterEdit}
                hitSlop={6}
              >
                <Feather name="edit-2" size={18} color={semantic.inkMuted} />
              </Pressable>
            )}
            <Pressable style={styles.iconBtn} onPress={() => {}}>
              <Feather name="settings" size={18} color={semantic.inkMuted} />
            </Pressable>
          </View>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            {isEditing ? (
              <Pressable onPress={handleAvatarPress} style={styles.avatarWrap}>
                <Avatar name={editingName || "?"} size="xl" />
                <View style={styles.avatarOverlay}>
                  <Feather name="camera" size={20} color="#FFFFFF" />
                </View>
              </Pressable>
            ) : (
              <Avatar name={displayName} size="xl" />
            )}
            <View style={styles.profileInfo}>
              {isEditing ? (
                <TextInput
                  style={styles.nameInput}
                  value={editingName}
                  onChangeText={setEditingName}
                  placeholder="Display name"
                  placeholderTextColor={semantic.inkSoft}
                  autoFocus
                  maxLength={50}
                />
              ) : (
                <Text style={styles.profileName}>{displayName}</Text>
              )}

              {!isEditing && showLocation && homeRegion && (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={12} color={semantic.inkMuted} />
                  <Text style={styles.locationText}>{homeRegion}</Text>
                </View>
              )}

              {!isEditing && (
                <View style={styles.anonBadge}>
                  <Feather
                    name={anonMeta.icon}
                    size={10}
                    color={semantic.inkMuted}
                  />
                  <Text style={styles.anonBadgeText}>{anonMeta.label}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.monoLabel}>BIO</Text>
            {isEditing ? (
              <TextInput
                style={styles.bioInput}
                value={editingBio}
                onChangeText={setEditingBio}
                placeholder="Write a short bio for your pen pals…"
                placeholderTextColor={semantic.inkSoft}
                multiline
                maxLength={280}
              />
            ) : bio ? (
              <Text style={styles.bioText}>{bio}</Text>
            ) : (
              <Pressable onPress={enterEdit}>
                <Text style={styles.bioPlaceholder}>
                  Tap to add a bio — your pen pals will see this.
                </Text>
              </Pressable>
            )}
          </View>

          {/* Interests */}
          <View style={styles.section}>
            <Text style={styles.monoLabel}>INTERESTS</Text>
            {interests.length > 0 ? (
              <View style={styles.chipGrid}>
                {interests.map((interest) => (
                  <View key={interest} style={styles.displayChip}>
                    <Text style={styles.displayChipText}>{interest}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyHint}>None selected yet</Text>
            )}
          </View>

          {/* Reply style */}
          <View style={styles.section}>
            <Text style={styles.monoLabel}>WRITING PACE</Text>
            <View style={styles.paceRow}>
              <Feather
                name={replyMeta.icon}
                size={14}
                color={semantic.accentInk}
              />
              <Text style={styles.paceText}>{replyMeta.label}</Text>
            </View>
          </View>
        </View>

        {/* Save / Cancel row */}
        {isEditing && (
          <View style={styles.saveRow}>
            <View style={styles.saveBtnWrap}>
              <Button full variant="ghost" onPress={cancelEdit}>
                Cancel
              </Button>
            </View>
            <View style={styles.saveBtnWrap}>
              {saving ? (
                <View style={styles.savingPlaceholder}>
                  <ActivityIndicator color={semantic.accentFg} />
                </View>
              ) : (
                <Button full onPress={saveEdit}>
                  Save
                </Button>
              )}
            </View>
          </View>
        )}

        {/* Completeness */}
        {completenessScore < 100 && (
          <View style={styles.completenessCard}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessLabel}>Profile strength</Text>
              <Text style={styles.completenessScore}>
                {completenessScore}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth }]}
              />
            </View>
            {completenessMissing.length > 0 && (
              <View style={styles.missingRow}>
                <Text style={styles.missingLabel}>Missing:</Text>
                <Pressable
                  onPress={() => setIsEditing(true)}
                  style={styles.missingChip}
                >
                  <Text style={styles.missingChipText}>
                    {completenessMissing[0]}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatTile value="0" label="Letters sent" />
          <StatTile value="0" label="Pen pals" />
          <StatTile value="1" label="Days writing" />
        </View>

        {/* Account section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.listCard}>
          {ACCOUNT_ROWS.map((row, i) => (
            <React.Fragment key={row.label}>
              <Pressable
                style={styles.listRow}
                onPress={() => handleAccountRowPress(row)}
              >
                <Feather name={row.icon} size={18} color={semantic.accentInk} />
                <Text style={styles.listRowText}>{row.label}</Text>
                <Feather
                  name="chevron-right"
                  size={14}
                  color={semantic.inkSoft}
                />
              </Pressable>
              {i < ACCOUNT_ROWS.length - 1 && (
                <View style={styles.listDivider} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>
          Danger zone
        </Text>
        <View style={styles.listCard}>
          <Pressable style={styles.listRow} onPress={handleSignOut}>
            <Feather name="log-out" size={18} color={colors.paper[5]} />
            <Text style={styles.listRowText}>Sign out</Text>
            <Feather
              name="chevron-right"
              size={14}
              color={semantic.inkSoft}
            />
          </Pressable>
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stat Tile ──────────────────────────────────────────────────────────────

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: semantic.bg },
  scroll: { paddingBottom: spacing[4] },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    marginBottom: spacing[4],
  },
  headerBtns: {
    flexDirection: "row",
    gap: spacing[2],
  },
  heading: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    fontWeight: "400",
    color: semantic.ink,
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
  profileCard: {
    backgroundColor: semantic.surface,
    borderRadius: spacing[5],
    marginHorizontal: spacing[5],
    padding: spacing[5],
    ...Platform.select({
      ios: {
        shadowColor: colors.paper[9],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  profileTop: { flexDirection: "row", alignItems: "center" },
  avatarWrap: {
    position: "relative",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    backgroundColor: "rgba(19, 15, 10, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1, marginLeft: 14, gap: spacing[1] },
  profileName: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    color: semantic.ink,
  },
  nameInput: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    color: semantic.ink,
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 10,
    padding: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  locationText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkMuted,
  },
  anonBadge: {
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
  },
  anonBadgeText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.xs,
    color: semantic.inkMuted,
  },
  section: { marginTop: spacing[4], gap: spacing[2] },
  monoLabel: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  bioText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.ink,
    lineHeight: 21,
  },
  bioPlaceholder: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    fontStyle: "italic",
    color: semantic.inkSoft,
  },
  bioInput: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.ink,
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    maxHeight: 160,
    textAlignVertical: "top",
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
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
  emptyHint: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkSoft,
  },
  paceRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  paceText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.ink,
  },
  saveRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginHorizontal: 20,
  },
  saveBtnWrap: {
    flex: 1,
  },
  savingPlaceholder: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.accent,
  },
  completenessCard: {
    backgroundColor: semantic.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: semantic.rule,
  },
  completenessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completenessLabel: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontWeight: "500",
    color: semantic.ink,
  },
  completenessScore: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontWeight: "600",
    color: semantic.accentInk,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: semantic.surface2,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: semantic.accentInk,
  },
  missingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  missingLabel: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
  },
  missingChip: {
    backgroundColor: semantic.accentSoft,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  missingChipText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.accentInk,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: spacing[5],
    marginTop: spacing[3],
    gap: 10,
  },
  statTile: {
    flex: 1,
    backgroundColor: semantic.surface,
    borderRadius: spacing[4],
    padding: 14,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: colors.paper[9],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  statValue: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.scale.xl,
    color: semantic.ink,
  },
  statLabel: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    color: semantic.inkSoft,
    marginTop: spacing[1],
  },
  sectionLabel: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingHorizontal: spacing[5],
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  listCard: {
    backgroundColor: semantic.surface,
    borderRadius: spacing[4],
    marginHorizontal: spacing[5],
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: colors.paper[9],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  listRowText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    color: semantic.ink,
    flex: 1,
  },
  listDivider: {
    height: 1,
    backgroundColor: semantic.ruleSoft,
    marginLeft: spacing[4] + 18 + spacing[3],
  },
});
