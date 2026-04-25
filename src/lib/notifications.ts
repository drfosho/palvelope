import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    // Required in newer expo-notifications; both keys map to the iOS banner.
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications only work on physical devices");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    if (!projectId) {
      console.warn(
        "[push] No projectId found — skipping push token registration"
      );
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;
    console.log("Push token:", token);

    await supabase.from("push_tokens").upsert(
      { user_id: userId, token, platform: Platform.OS },
      { onConflict: "user_id,token" }
    );

    return token;
  } catch (e) {
    console.warn("[push] registerForPushNotifications failed:", e);
    return null;
  }
}
