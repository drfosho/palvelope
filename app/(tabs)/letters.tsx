import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Avatar, BrandMark, Button, Chip } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";
import { supabase, getConversations } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DisplayThread {
  id: string;
  palId: string;
  name: string;
  hue: number;
  region: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  draft: boolean;
  status: "active" | "archived" | "expired" | null;
}

// ─── Sample fallback (only shown if getConversations throws) ────────────────

const SAMPLE_THREADS: DisplayThread[] = [
  { id: "1", palId: "1", name: "Mira K.", hue: 210, region: "Europe", lastMessage: "The small things are the point, I think. I’m glad you sent it.", time: "09:31", unread: true, draft: false, status: "active" },
  { id: "2", palId: "2", name: "T.J.", hue: 145, region: "East Asia", lastMessage: "I’ve been walking the old canal district every morning this week.", time: "Yesterday", unread: false, draft: false, status: "active" },
  { id: "3", palId: "4", name: "Søren", hue: 260, region: "Europe", lastMessage: "Draft saved — finish your letter", time: "2d ago", unread: false, draft: true, status: "active" },
  { id: "4", palId: "5", name: "Lena B.", hue: 340, region: "Americas", lastMessage: "What a strange and beautiful question that was.", time: "3d ago", unread: false, draft: false, status: "active" },
  { id: "5", palId: "6", name: "Rafi", hue: 180, region: "Middle East", lastMessage: "Sent you a recipe. It’s my grandmother’s.", time: "5d ago", unread: false, draft: false, status: "active" },
];

const FILTERS = ["All", "Unread", "Writing back", "Archived"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function hueFromId(id: string): number {
  return ((id.charCodeAt(0) || 0) + (id.charCodeAt(1) || 0)) % 360;
}

function formatThreadTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate()
  );
  const msInDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThen.getTime()) / msInDay
  );
  if (dayDiff <= 0) {
    const h = String(then.getHours()).padStart(2, "0");
    const m = String(then.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (dayDiff === 1) return "Yesterday";
  return `${dayDiff}d ago`;
}

function normalizeConversation(convo: any, _currentUserId: string): DisplayThread {
  const otherProfile = convo.other_profile;
  const profileId = otherProfile?.id ?? "";
  return {
    id: convo.id,
    palId: profileId,
    name: otherProfile?.display_name ?? "Anonymous",
    hue: hueFromId(profileId),
    region: otherProfile?.home_region ?? "",
    lastMessage: convo.last_message_preview ?? "No messages yet",
    time: formatThreadTime(convo.last_message_at),
    unread: false,
    draft: false,
    status: (convo.status ?? "active") as DisplayThread["status"],
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Letters() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (cancelled) return;
          setUsingSampleData(true);
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setCurrentUserId(session.user.id);

        const convos = await getConversations(session.user.id);
        console.log(
          "[Letters] conversations:",
          JSON.stringify(convos, null, 2)
        );
        if (cancelled) return;
        setConversations(convos);
        setUsingSampleData(false);
        setLoading(false);
      } catch (e) {
        console.error("[letters] getConversations failed:", e);
        if (cancelled) return;
        setUsingSampleData(true);
        setLoading(false);
      }
    };

    load();

    channel = supabase
      .channel("conversations-list")
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "conversations" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const allThreads: DisplayThread[] = usingSampleData
    ? SAMPLE_THREADS
    : currentUserId
    ? conversations.map((c) => normalizeConversation(c, currentUserId))
    : [];

  const threads =
    activeFilter === "Archived"
      ? allThreads.filter(
          (t) => t.status === "expired" || t.status === "archived"
        )
      : allThreads.filter((t) => t.status === "active" || !t.status);

  const unreadCount = threads.filter((t) => t.unread).length;
  const hasThreads = threads.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Your letters</Text>
          <Text style={styles.headingSub}>
            {threads.length} conversations
            {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
          </Text>
          {usingSampleData && (
            <Text style={styles.sampleNote}>Showing sample data</Text>
          )}
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={() =>
            Alert.alert(
              "Start from Discover",
              "Find someone to write to first — then your conversation will appear here.",
              [
                {
                  text: "Go to Discover",
                  onPress: () => router.push("/(tabs)/discover"),
                },
              ]
            )
          }
        >
          <Feather name="edit" size={18} color={semantic.inkMuted} />
        </Pressable>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={f}
            size="sm"
            selected={activeFilter === f}
            onPress={() => setActiveFilter(f)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={semantic.accent} />
        </View>
      ) : hasThreads ? (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {threads.map((thread, i) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              isLast={i === threads.length - 1}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: {
                    id: thread.palId,
                    name: thread.name,
                    hue: String(thread.hue),
                  },
                })
              }
            />
          ))}
        </ScrollView>
      ) : (
        <EmptyState onDiscover={() => router.push("/(tabs)/discover")} />
      )}
    </SafeAreaView>
  );
}

// ─── Thread Row ─────────────────────────────────────────────────────────────

function ThreadRow({
  thread,
  isLast,
  onPress,
}: {
  thread: DisplayThread;
  isLast: boolean;
  onPress: () => void;
}) {
  const isArchived =
    thread.status === "expired" || thread.status === "archived";
  return (
    <Pressable style={styles.threadRow} onPress={onPress}>
      <Avatar name={thread.name} size="md" hue={thread.hue} />

      <View style={styles.threadContent}>
        {/* Name + time */}
        <View style={styles.threadTopRow}>
          <Text
            style={[
              styles.threadName,
              thread.unread && !isArchived && styles.threadNameUnread,
              isArchived && styles.threadNameArchived,
            ]}
            numberOfLines={1}
          >
            {thread.name}
          </Text>
          <Text style={styles.threadTime}>
            {isArchived ? "Archived" : thread.time}
          </Text>
        </View>

        {/* Preview */}
        {thread.draft ? (
          <Text style={styles.threadDraft} numberOfLines={1}>
            Draft saved — finish your letter
          </Text>
        ) : (
          <Text
            style={[
              styles.threadPreview,
              thread.unread && !isArchived && styles.threadPreviewUnread,
            ]}
            numberOfLines={1}
          >
            {thread.lastMessage}
          </Text>
        )}
      </View>

      {/* Indicator — hidden for archived */}
      {!isArchived && thread.unread ? (
        <View style={styles.unreadDot} />
      ) : !isArchived && thread.draft ? (
        <Feather name="edit-2" size={14} color={semantic.accentInk} />
      ) : null}

      {/* Separator — inset past avatar */}
      {!isLast && <View style={styles.separator} />}
    </Pressable>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onDiscover }: { onDiscover: () => void }) {
  return (
    <View style={styles.empty}>
      <BrandMark size={28} />
      <Text style={styles.emptyTitle}>No letters yet</Text>
      <Text style={styles.emptySubtitle}>Find someone to write to</Text>
      <Button onPress={onDiscover}>Discover people</Button>
    </View>
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  heading: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    fontWeight: "400",
    color: semantic.ink,
  },
  headingSub: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkMuted,
    marginTop: spacing[1],
  },
  sampleNote: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.xs,
    color: semantic.inkSoft,
    marginTop: 2,
    fontStyle: "italic",
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
  filterRow: {
    paddingLeft: spacing[5],
    paddingRight: spacing[2],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  list: {
    paddingBottom: spacing[8],
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Thread row
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    gap: 14,
  },
  threadContent: {
    flex: 1,
    gap: 2,
  },
  threadTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  threadName: {
    fontFamily: typography.fontDisplay,
    fontSize: 15.5,
    fontWeight: "400",
    color: semantic.ink,
    flex: 1,
  },
  threadNameUnread: {
    fontWeight: "500",
  },
  threadNameArchived: {
    fontStyle: "italic",
    color: semantic.inkSoft,
  },
  threadTime: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.xs,
    color: semantic.inkSoft,
    marginLeft: spacing[2],
  },
  threadPreview: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkMuted,
  },
  threadPreviewUnread: {
    color: semantic.ink,
  },
  threadDraft: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    fontStyle: "italic",
    color: semantic.accentInk,
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
    left: spacing[5] + 36 + 14, // paddingLeft + avatar width + gap
    right: spacing[5],
    height: 1,
    backgroundColor: semantic.ruleSoft,
  },

  // Empty
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[3],
  },
  emptyTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.scale.lg,
    color: semantic.ink,
  },
  emptySubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.inkMuted,
  },
});
