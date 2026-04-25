import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Avatar, BrandMark } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";
import SAMPLE_PALS from "@/data/samplePals";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "new_letter" | "new_match";
  name: string;
  hue: number;
  text: string;
  time: string;
  read: boolean;
}

// ─── Sample data ────────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "new_letter", name: "Mira K.", hue: 210, text: "sent you a new letter.", time: "9 min ago", read: false },
  { id: "2", type: "new_match", name: "Yuki T.", hue: 90, text: "was matched with you. Say hello?", time: "2h ago", read: false },
  { id: "3", type: "new_letter", name: "Lena B.", hue: 340, text: "replied to your letter.", time: "Yesterday", read: true },
  { id: "4", type: "new_match", name: "Rafi", hue: 180, text: "was matched with you. Say hello?", time: "2d ago", read: true },
  { id: "5", type: "new_match", name: "S\u00F8ren", hue: 260, text: "was matched with you. Say hello?", time: "3d ago", read: true },
];

// Map notification names to pal IDs for navigation
const NAME_TO_PAL_ID: Record<string, string> = {};
SAMPLE_PALS.forEach((p) => { NAME_TO_PAL_ID[p.name] = p.id; });

const LETTER_PAL_IDS: Record<string, string> = {
  "Mira K.": "1",
  "Lena B.": "5",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handlePress = (notif: Notification) => {
    markRead(notif.id);
    switch (notif.type) {
      case "new_letter": {
        const palId = LETTER_PAL_IDS[notif.name] ?? "1";
        router.push({
          pathname: "/chat/[id]",
          params: { id: palId, name: notif.name, hue: String(notif.hue) },
        });
        break;
      }
      case "new_match": {
        const palId = NAME_TO_PAL_ID[notif.name] ?? "1";
        router.push({
          pathname: "/pal/[id]",
          params: { id: palId, name: notif.name, hue: String(notif.hue) },
        });
        break;
      }
    }
  };

  const hasNotifications = notifications.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
        </Pressable>
        <Text style={styles.heading}>Notifications</Text>
        <Pressable onPress={markAllRead}>
          <Text style={styles.markAllRead}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {hasNotifications ? (
          <View>
            {notifications.map((notif, i) => (
              <NotificationRow
                key={notif.id}
                notif={notif}
                isLast={i === notifications.length - 1}
                onPress={() => handlePress(notif)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCentered}>
            <BrandMark size={28} />
            <Text style={styles.emptyTitle}>All caught up.</Text>
            <Text style={styles.emptySub}>Nothing new right now.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Notification Row ───────────────────────────────────────────────────────

function NotificationRow({
  notif,
  isLast,
  onPress,
}: {
  notif: Notification;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.row, !notif.read && styles.rowUnread]}
      onPress={onPress}
    >
      {/* Avatar */}
      <Avatar name={notif.name} size="sm" hue={notif.hue} />

      {/* Text */}
      <View style={styles.rowContent}>
        <Text style={styles.rowText}>
          <Text style={styles.rowName}>{notif.name}</Text>{" "}
          <Text style={styles.rowBody}>{notif.text}</Text>
        </Text>
        <Text style={styles.rowTime}>{notif.time}</Text>
      </View>

      {/* Unread dot */}
      {!notif.read && <View style={styles.unreadDot} />}

      {/* Separator */}
      {!isLast && <View style={styles.separator} />}
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantic.bg,
  },
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
  markAllRead: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.accentInk,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: spacing[8],
  },
  emptyCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: spacing[2],
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: 14,
    gap: spacing[3],
  },
  rowUnread: {
    backgroundColor: semantic.surface2,
  },
  rowContent: {
    flex: 1,
  },
  rowText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.inkMuted,
    lineHeight: 20,
  },
  rowName: {
    fontWeight: "500",
    color: semantic.ink,
  },
  rowBody: {
    color: semantic.inkMuted,
  },
  rowTime: {
    fontFamily: typography.fontBody,
    fontSize: 11.5,
    color: semantic.inkSoft,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: semantic.accentInk,
  },
  separator: {
    position: "absolute",
    bottom: 0,
    left: spacing[5] + 28 + spacing[3],
    right: spacing[5],
    height: 1,
    backgroundColor: semantic.ruleSoft,
  },

  // Empty inner stack — centering handled by emptyCentered wrapper
  emptyTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    color: semantic.ink,
    marginTop: spacing[3],
    textAlign: "center",
  },
  emptySub: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.inkMuted,
    marginTop: 8,
    textAlign: "center",
  },
});
