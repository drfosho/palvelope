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

const AGE_RANGES = [
  "16\u201317",
  "18\u201324",
  "25\u201334",
  "35\u201344",
  "45\u201354",
  "55+",
] as const;

export default function Create() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = email.trim().length > 0 && ageRange !== null && agreed;

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: 'TempPass1!' + Math.random().toString(36).slice(-6),
      options: { data: { age_range: ageRange, onboarding_complete: false } }
    });
    setLoading(false);
    if (data.session) router.push('/(auth)/onboarding');
    else if (err) setError(err.message);
  }, [canContinue, email, ageRange, router]);

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

          <View style={styles.spacer} />

          <Button
            full
            disabled={!canContinue || loading}
            onPress={handleContinue}
          >
            {loading ? "Creating\u2026" : "Continue"}
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
