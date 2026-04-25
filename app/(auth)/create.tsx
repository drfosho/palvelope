// TODO: Re-enable email confirmation in Supabase dashboard before App Store submission

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BrandMark, Button, Chip, TextInput } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";
import { supabase } from "@/lib/supabase";

const ERROR_COLOR = "#B4402A";
const INVITE_CODE_RE = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;

const AGE_RANGES = [
  "16–17",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55+",
] as const;

async function acceptInviteCode(rawCode: string, newUserId: string) {
  const code = rawCode.toUpperCase();
  const { data: invite, error: lookupErr } = await supabase
    .from("invites")
    .select("*")
    .eq("code", code)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (lookupErr) {
    console.warn("[invite] lookup error:", lookupErr);
    return;
  }
  if (!invite) {
    console.warn("[invite] no matching pending invite for", code);
    return;
  }

  const { error: acceptErr } = await supabase
    .from("invites")
    .update({
      accepted_by: newUserId,
      accepted_at: new Date().toISOString(),
      status: "accepted",
    })
    .eq("id", invite.id);
  if (acceptErr) console.warn("[invite] accept error:", acceptErr);

  const { error: tcErr } = await supabase.from("trusted_connections").insert({
    user_1: invite.inviter_id,
    user_2: newUserId,
  });
  if (tcErr) console.warn("[invite] trusted_connections insert:", tcErr);
}

export default function Create() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canContinue = email.trim().length > 0 && ageRange !== null && agreed;

  const handleInviteChange = (text: string) => {
    const cleaned = text
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 7);
    setInviteCode(cleaned);
    setInviteError(null);
  };

  const handleInviteBlur = () => {
    if (inviteCode.length > 0 && !INVITE_CODE_RE.test(inviteCode)) {
      setInviteError("Format should be XXX-XXX");
    }
  };

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;
    if (
      inviteCode.length > 0 &&
      !INVITE_CODE_RE.test(inviteCode)
    ) {
      setInviteError("Format should be XXX-XXX");
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: "TempPass1!" + Math.random().toString(36).slice(-6),
      options: { data: { age_range: ageRange, onboarding_complete: false } },
    });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    if (data.user && inviteCode.length > 0) {
      await acceptInviteCode(inviteCode, data.user.id);
    }
    setLoading(false);
    if (data.session) router.push("/(auth)/onboarding");
  }, [canContinue, email, ageRange, inviteCode, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
          </Pressable>

          <BrandMark size={28} />

          <Text style={styles.headline}>
            Set up <Text style={styles.headlineAccent}>your desk.</Text>
          </Text>
          <Text style={styles.subtitle}>
            A few quick details before we begin. You'll pick a name and
            interests next.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>AGE RANGE</Text>
            <View style={styles.chipRow}>
              {AGE_RANGES.map((range) => (
                <Chip
                  key={range}
                  label={range}
                  selected={ageRange === range}
                  onPress={() => setAgeRange(range)}
                />
              ))}
            </View>
            <Text style={styles.helperText}>
              Only used for matching. Never shown on your profile unless you say
              so.
            </Text>
          </View>

          <Pressable
            style={styles.termsCard}
            onPress={() => setAgreed((a) => !a)}
          >
            <View
              style={[
                styles.checkbox,
                agreed ? styles.checkboxChecked : styles.checkboxUnchecked,
              ]}
            >
              {agreed && (
                <Feather name="check" size={14} color={semantic.accentFg} />
              )}
            </View>
            <Text style={styles.termsText}>
              I agree to Palvelope's{" "}
              <Text style={styles.termsLink}>terms</Text> and{" "}
              <Text style={styles.termsLink}>community rules</Text> — be kind,
              be a real human, don't harass.
            </Text>
          </Pressable>

          {/* Invite code (collapsible) */}
          <Pressable
            style={styles.inviteToggle}
            onPress={() => setInviteOpen((v) => !v)}
          >
            <Text style={styles.inviteToggleText}>
              Have an invite code?
            </Text>
            <Feather
              name={inviteOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color={semantic.accentInk}
            />
          </Pressable>
          {inviteOpen && (
            <View style={styles.inviteFieldGroup}>
              <TextInput
                value={inviteCode}
                onChangeText={handleInviteChange}
                onBlur={handleInviteBlur}
                placeholder="e.g. XK9-TW2"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
              />
              {inviteError && (
                <Text style={styles.inviteError}>{inviteError}</Text>
              )}
            </View>
          )}

          <View style={styles.spacer} />

          <Button
            full
            disabled={!canContinue || loading}
            onPress={handleContinue}
          >
            {loading ? "Creating…" : "Continue"}
          </Button>
          {loading && (
            <ActivityIndicator
              color={semantic.accentInk}
              style={styles.spinner}
            />
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.linkRow}>
            <Text style={styles.linkHint}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/sign-in")}>
              <Text style={styles.linkAction}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: semantic.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing[4],
    backgroundColor: semantic.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  headline: {
    fontFamily: typography.fontDisplay,
    fontSize: 28,
    fontWeight: "400",
    color: semantic.ink,
    letterSpacing: -0.3,
    marginTop: spacing[5],
    lineHeight: 36,
  },
  headlineAccent: { fontStyle: "italic", color: semantic.accentInk },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14.5,
    color: semantic.inkMuted,
    marginTop: spacing[2],
    lineHeight: 21,
  },
  fieldGroup: { marginTop: spacing[6], gap: spacing[2] },
  label: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  helperText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
    lineHeight: 17,
  },
  termsCard: {
    flexDirection: "row",
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.ruleSoft,
    borderRadius: 14,
    padding: 14,
    gap: spacing[3],
    marginTop: spacing[6],
    alignItems: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: semantic.accentInk },
  checkboxUnchecked: {
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.rule,
  },
  termsText: {
    fontFamily: typography.fontBody,
    fontSize: 12.5,
    color: semantic.inkMuted,
    lineHeight: 19.5,
    flex: 1,
  },
  termsLink: { color: semantic.accentInk },

  inviteToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: spacing[3],
    paddingVertical: spacing[1],
  },
  inviteToggleText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.accentInk,
    fontWeight: "500",
  },
  inviteFieldGroup: {
    marginTop: spacing[2],
    gap: spacing[1],
  },
  inviteError: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: ERROR_COLOR,
  },

  spacer: { flex: 1, minHeight: spacing[8] },
  spinner: { marginTop: spacing[2] },
  errorText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: ERROR_COLOR,
    textAlign: "center",
    marginTop: spacing[2],
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing[3],
  },
  linkHint: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkSoft,
  },
  linkAction: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    fontWeight: "500",
    color: semantic.accentInk,
  },
});
