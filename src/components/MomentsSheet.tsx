import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { semantic, typography, spacing } from "@/theme/tokens";
import { getMoments, deleteMoment, type Moment } from "@/lib/supabase";

interface MomentsSheetProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string | null;
}

function formatMomentTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfThen = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThen.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return `${dayDiff}d ago`;
  return d.toLocaleDateString();
}

export default function MomentsSheet({
  visible,
  onClose,
  conversationId,
}: MomentsSheetProps) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!conversationId) {
      setMoments([]);
      return;
    }
    setLoading(true);
    const data = await getMoments(conversationId);
    setMoments(data);
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, conversationId]);

  const handleDelete = (moment: Moment) => {
    Alert.alert(
      "Forget this moment?",
      "It won’t be visible to either of you anymore.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteMoment(moment.id);
            if (error) {
              Alert.alert("Couldn’t delete", error.message);
              return;
            }
            setMoments((prev) => prev.filter((m) => m.id !== moment.id));
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>Moments</Text>
        <Text style={styles.subtitle}>
          Things worth keeping from this conversation
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={semantic.accentInk} />
          </View>
        ) : moments.length === 0 ? (
          <View style={styles.empty}>
            <Feather
              name="book-open"
              size={28}
              color={semantic.inkSoft}
            />
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptySub}>
              Long press any message to save a moment
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {moments.map((m) => (
              <View key={m.id} style={styles.card}>
                <Text style={styles.content}>{m.content}</Text>
                {m.note ? <Text style={styles.note}>{m.note}</Text> : null}
                <View style={styles.cardBottom}>
                  <Text style={styles.timestamp}>
                    {formatMomentTime(m.created_at)}
                  </Text>
                  <Pressable
                    onPress={() => handleDelete(m)}
                    hitSlop={8}
                  >
                    <Feather
                      name="trash"
                      size={12}
                      color={semantic.inkSoft}
                    />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.bg,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: semantic.rule,
    marginBottom: spacing[4],
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    color: semantic.ink,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    color: semantic.inkMuted,
    marginTop: spacing[2],
  },
  emptySub: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkSoft,
  },
  list: {
    paddingTop: 16,
    paddingBottom: spacing[8],
  },
  card: {
    backgroundColor: semantic.surface2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: semantic.accentInk,
  },
  content: {
    fontFamily: typography.fontDisplay,
    fontSize: 14,
    color: semantic.ink,
    lineHeight: 14 * 1.6,
  },
  note: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontStyle: "italic",
    color: semantic.inkMuted,
    marginTop: 6,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  timestamp: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: semantic.inkSoft,
  },
});
