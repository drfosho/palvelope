// SUPABASE DASHBOARD SETTINGS REQUIRED:
// Authentication → Configuration → Email:
//   ✓ Enable email provider: ON
//   ✓ Confirm email: OFF (for dev — mailer_autoconfirm: true)
// Authentication → URL Configuration → Redirect URLs — add ALL of these:
//   palvelope://
//   exp://localhost:8081/--/
//   exp://127.0.0.1:8081/--/
//   exp://YOUR_LOCAL_IP:8081/--/   (run ifconfig to find your IP)
//
// This project uses magic link auth (email OTP is disabled server-side).
// The user taps a link in their email which opens the app via deep link.

import React, { useState, useCallback, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import { BrandMark, Button, TextInput } from "@/components/ui";
import { semantic, typography, spacing, radius } from "@/theme/tokens";
import { supabase } from "@/lib/supabase";

const ERROR_COLOR = "#B4402A";

type Stage = "email" | "waiting";

export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; stage?: string }>();

  // In Expo Go: exp://IP:PORT/--/  |  In dev build/standalone: palvelope://
  const redirectUrl =
    Constants.appOwnership === "expo"
      ? makeRedirectUri({ scheme: "palvelope", path: "/" })
      : "palvelope://";

  useEffect(() => {
    console.log("[SignIn] redirectUrl:", redirectUrl);
  }, []);

  const [stage, setStage] = useState<Stage>(
    params.stage === "waiting" ? "waiting" : "email"
  );
  const [email, setEmail] = useState(params.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendLink = useCallback(async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    console.log("[SignIn] Sending magic link to:", email.trim().toLowerCase());
    console.log("[SignIn] emailRedirectTo:", redirectUrl);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectUrl,
      },
    });
    setLoading(false);
    if (err) {
      console.log("[SignIn] OTP error:", err.message);
      setError("No account found with that email. Try creating one.");
    } else {
      setStage("waiting");
    }
  }, [email, redirectUrl]);

  const handleResend = useCallback(async () => {
    setError(null);
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectUrl,
      },
    });
    setLoading(false);
  }, [email, redirectUrl]);

  const backAction = () => {
    setError(null);
    if (stage === "waiting") {
      setStage("email");
    } else {
      router.back();
    }
  };

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
          <Pressable style={styles.backBtn} onPress={backAction}>
            <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
          </Pressable>

          <BrandMark size={28} />

          {stage === "email" ? (
            <>
              <Text style={styles.headline}>
                Welcome back to{" "}
                <Text style={styles.headlineAccent}>your desk.</Text>
              </Text>
              <Text style={styles.subtitle}>
                Enter the email you signed up with. We'll send a sign-in link
                — no passwords to remember.
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

              <View style={styles.privacyCard}>
                <Feather name="lock" size={16} color={semantic.accentInk} />
                <Text style={styles.privacyText}>
                  We never use your email for marketing. No contact uploads, no
                  friend-finding.
                </Text>
              </View>

              <View style={styles.spacer} />

              <Button
                full
                disabled={!email.trim() || loading}
                onPress={handleSendLink}
              >
                {loading ? "Sending\u2026" : "Send a sign-in link"}
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
            </>
          ) : (
            <>
              <Text style={styles.headline}>Check your email.</Text>
              <Text style={styles.subtitle}>
                We sent a sign-in link to{" "}
                <Text style={{ fontWeight: "500", color: semantic.ink }}>
                  {email}
                </Text>
                . Tap the link in the email to sign in — it'll open this app
                automatically.
              </Text>

              <View style={styles.waitingCard}>
                <Feather name="mail" size={32} color={semantic.accentInk} />
                <Text style={styles.waitingTitle}>Waiting for you</Text>
                <Text style={styles.waitingBody}>
                  Open your email app, find the message from Palvelope, and tap
                  the sign-in link. This screen will update automatically.
                </Text>
                <ActivityIndicator
                  color={semantic.accentInk}
                  style={styles.waitingSpinner}
                />
              </View>

              <Pressable onPress={() => setStage("email")}>
                <Text style={styles.differentEmail}>
                  ← Use a different email
                </Text>
              </Pressable>

              <View style={styles.spacer} />

              <Pressable onPress={handleResend} disabled={loading}>
                <Text style={styles.resendLink}>
                  {loading
                    ? "Sending\u2026"
                    : "Didn\u2019t get it? Send again"}
                </Text>
              </Pressable>
            </>
          )}
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
  waitingCard: {
    alignItems: "center",
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.ruleSoft,
    borderRadius: radius.lg,
    padding: spacing[6],
    marginTop: spacing[8],
    gap: spacing[3],
  },
  waitingTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.scale.lg,
    color: semantic.ink,
  },
  waitingBody: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.inkMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  waitingSpinner: { marginTop: spacing[2] },
  differentEmail: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkMuted,
    marginTop: spacing[4],
    textAlign: "center",
  },
  resendLink: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    fontWeight: "500",
    color: semantic.accentInk,
    textAlign: "center",
  },
});
