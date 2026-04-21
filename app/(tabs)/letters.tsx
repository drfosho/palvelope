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
import { Avatar, BrandMark, Button, Chip } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Thread {
  id: string;
  palId: string;
  name: string;
  hue: number;
  region: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  draft: boolean;
}

// ─── Sample data ────────────────────────────────────────────────────────────

const SAMPLE_THREADS: Thread[] = [
  { id: "1", palId: "1", name: "Mira K.", hue: 210, region: "Europe", lastMessage: "The small things are the point, I think. I\u2019m glad you sent it.", time: "09:31", unread: true, draft: false },
  { id: "2", palId: "2", name: "T.J.", hue: 145, region: "East Asia", lastMessage: "I\u2019ve been walking the old canal district every morning this week.", time: "Yesterday", unread: false, draft: false },
  { id: "3", palId: "4", name: "S\u00F8ren", hue: 260, region: "Europe", lastMessage: "Draft saved \u2014 finish your letter", time: "2d ago", unread: false, draft: true },
  { id: "4", palId: "5", name: "Lena B.", hue: 340, region: "Americas", lastMessage: "What a strange and beautiful question that was.", time: "3d ago", unread: false, draft: false },
  { id: "5", palId: "6", name: "Rafi", hue: 180, region: "Middle East", lastMessage: "Sent you a recipe. It\u2019s my grandmother\u2019s.", time: "5d ago", unread: false, draft: false },
];

const FILTERS = ["All", "Unread", "Writing back", "Archived"];

const unreadCount = SAMPLE_THREADS.filter((t) => t.unread).length;

// ─── Component ──────────────────────────────────────────────────────────────

export default function Letters() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");

  const hasThreads = SAMPLE_THREADS.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Your letters</Text>
          <Text style={styles.headingSub}>
            {SAMPLE_THREADS.length} conversations &middot; {unreadCount} unread
          </Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => {}}>
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

      {hasThreads ? (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {SAMPLE_THREADS.map((thread, i) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              isLast={i === SAMPLE_THREADS.length - 1}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: thread.palId, name: thread.name, hue: String(thread.hue) },
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
  thread: Thread;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.threadRow} onPress={onPress}>
      <Avatar name={thread.name} size="md" hue={thread.hue} />

      <View style={styles.threadContent}>
        {/* Name + time */}
        <View style={styles.threadTopRow}>
          <Text
            style={[
              styles.threadName,
              thread.unread && styles.threadNameUnread,
            ]}
            numberOfLines={1}
          >
            {thread.name}
          </Text>
          <Text style={styles.threadTime}>{thread.time}</Text>
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
              thread.unread && styles.threadPreviewUnread,
            ]}
            numberOfLines={1}
          >
            {thread.lastMessage}
          </Text>
        )}
      </View>

      {/* Indicator */}
      {thread.unread ? (
        <View style={styles.unreadDot} />
      ) : thread.draft ? (
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
