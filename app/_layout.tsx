import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import "../global.css";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

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
