import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import "../global.css";

// ─── Deep link token extraction ─────────────────────────────────────────────

async function handleDeepLink(url: string) {
  console.log("[DeepLink] Received:", url);

  if (!url.includes("access_token")) return;

  // Try hash fragment first: ...#access_token=...&refresh_token=...
  const fragmentIndex = url.indexOf("#");
  if (fragmentIndex !== -1) {
    const fragment = url.substring(fragmentIndex + 1);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      console.log("[DeepLink] Setting session from fragment tokens");
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) console.error("[DeepLink] setSession error:", error);
      return;
    }
  }

  // Fallback: try query params: ...?access_token=...&refresh_token=...
  const queryIndex = url.indexOf("?");
  if (queryIndex !== -1) {
    const query = url.substring(queryIndex + 1).split("#")[0];
    const params = new URLSearchParams(query);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      console.log("[DeepLink] Setting session from query params");
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) console.error("[DeepLink] setSession error:", error);
    }
  }
}

// ─── Root layout ────────────────────────────────────────────────────────────

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  // ─── Deep link listener ─────────────────────────────────────────────
  useEffect(() => {
    // Cold start: app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[DeepLink] Initial URL:", url);
        handleDeepLink(url);
      }
    });

    // Foreground: link received while app is running
    const sub = Linking.addEventListener("url", ({ url }) => {
      console.log("[DeepLink] Foreground URL:", url);
      handleDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  // ─── Auth state listener ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[Auth] State change:", _event, session ? "has session" : "no session");
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Routing based on auth state ────────────────────────────────────
  useEffect(() => {
    if (session === undefined) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/welcome");
    } else {
      const onboardingComplete =
        session.user.user_metadata?.onboarding_complete;
      if (!onboardingComplete) {
        router.replace("/(auth)/onboarding");
      } else {
        if (inAuthGroup) router.replace("/(tabs)/discover");
      }
    }
  }, [session, segments]);

  if (session === undefined) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
