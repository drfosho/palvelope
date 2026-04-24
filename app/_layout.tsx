import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";
import { registerForPushNotifications } from "@/lib/notifications";
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
      console.log(
        "[Auth] State change:",
        _event,
        session ? "has session" : "no session"
      );
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

  // ─── Push notification registration (after sign-in) ─────────────────
  useEffect(() => {
    if (!session) return;
    registerForPushNotifications(session.user.id).catch((e) =>
      console.warn("[push] register failed:", e)
    );
  }, [session?.user.id]);

  // ─── Notification tap handler ───────────────────────────────────────
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { palId?: string; conversationId?: string }
          | undefined;
        if (data?.conversationId && data.palId) {
          router.push(`/chat/${data.palId}`);
        }
      }
    );
    return () => sub.remove();
  }, [router]);

  if (session === undefined) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="notification-preferences" />
      </Stack>
    </SafeAreaProvider>
  );
}
