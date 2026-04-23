// SUPABASE DASHBOARD SETTINGS REQUIRED:
// Authentication → Configuration → Email:
//   ✓ Enable email provider: ON
//   ✓ Confirm email: OFF (for dev — mailer_autoconfirm: true)

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
import { BrandMark, Button, TextInput } from "@/components/ui";
import { semantic, typography, spacing, radius } from "@/theme/tokens";
import { supabase } from "@/lib/supabase";

const ERROR_COLOR = "#B4402A";

export default function SignIn() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSignIn = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err) setError(err.message);
  }, [email, password, canSubmit]);

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
            Welcome back to{" "}
            <Text style={styles.headlineAccent}>your desk.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Sign in with your email and password.
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
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />
          </View>

          <View style={styles.privacyCard}>
            <Feather name="lock" size={16} color={semantic.accentInk} />
            <Text style={styles.privacyText}>
              We never use your email for marketing. No contact uploads, no
              friend-finding.
            </Text>
          </View>

          <View style={styles.spacer} />

          <Button full disabled={!canSubmit || loading} onPress={handleSignIn}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          {loading && (
            <ActivityIndicator
              color={semantic.accentInk}
              style={styles.spinner}
            />
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.linkRow}>
            <Text style={styles.linkHint}>New here? </Text>
            <Pressable onPress={() => router.push("/(auth)/create")}>
              <Text style={styles.linkAction}>Create an account</Text>
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
  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.ruleSoft,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[4],
  },
  privacyText: {
    fontFamily: typography.fontBody,
    fontSize: 12.5,
    color: semantic.inkMuted,
    flex: 1,
    lineHeight: 18,
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
