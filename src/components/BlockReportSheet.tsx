import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button, Chip } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";
import { supabase } from "@/lib/supabase";

const REPORT_RED = "#B4402A"; // ≈ oklch(0.55 0.18 25)
const REPORT_RED_BG = "#F4DCD4";

const REPORT_REASONS = [
  "Spam or bot",
  "Harassment",
  "Inappropriate content",
  "Fake profile",
  "Underage user",
  "Other",
];

interface BlockReportSheetProps {
  visible: boolean;
  onClose: () => void;
  palName: string;
  palId: string;
  conversationId: string | null;
}

type View_ = "main" | "report";

export default function BlockReportSheet({
  visible,
  onClose,
  palName,
  palId,
  conversationId,
}: BlockReportSheetProps) {
  const router = useRouter();
  const [view, setView] = useState<View_>("main");
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      // Reset state when sheet closes
      setView("main");
      setReportReason(null);
      setSubmitting(false);
    }
  }, [visible]);

  const closeAndReset = () => {
    onClose();
  };

  const handleSubmitReport = async () => {
    if (!reportReason) return;
    setSubmitting(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSubmitting(false);
      Alert.alert("Not signed in", "Please sign in to submit a report.");
      return;
    }
    const { error } = await supabase.from("reports").insert({
      reporter_id: session.user.id,
      reported_id: palId,
      conversation_id: conversationId,
      reason: reportReason,
    });
    setSubmitting(false);
    if (error) {
      console.error("[BlockReportSheet] report failed:", error);
      Alert.alert("Couldn’t send report", error.message);
      return;
    }
    Alert.alert(
      "Report sent",
      "Thank you. We’ll review it within a day.",
      [{ text: "OK", onPress: closeAndReset }]
    );
  };

  const handleUnmatchPress = () => {
    Alert.alert(
      `Unmatch ${palName}?`,
      `This conversation will be archived and you won’t be matched again. ${palName} won’t be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: () => {
            void handleUnmatch();
          },
        },
      ]
    );
  };

  const handleUnmatch = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    if (conversationId) {
      const { error: convoErr } = await supabase
        .from("conversations")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", conversationId);
      if (convoErr) console.warn("[unmatch] convo update:", convoErr);
    }

    const { error: blockErr } = await supabase.from("blocks").insert({
      blocker_id: session.user.id,
      blocked_id: palId,
      block_type: "unmatch",
    });
    if (blockErr) console.warn("[unmatch] block insert:", blockErr);

    closeAndReset();
    router.replace("/(tabs)/discover");
  };

  const handleBlockPress = () => {
    Alert.alert(
      `Block ${palName}?`,
      `${palName} won’t be able to write to you again, and you won’t be matched. They won’t be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            void handleBlock();
          },
        },
      ]
    );
  };

  const handleBlock = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    if (conversationId) {
      await supabase
        .from("conversations")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    const { error } = await supabase.from("blocks").insert({
      blocker_id: session.user.id,
      blocked_id: palId,
      block_type: "full",
    });
    if (error) console.warn("[block] insert:", error);

    closeAndReset();
    router.replace("/(tabs)/discover");
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

        {view === "main" ? (
          <>
            <Text style={styles.palName}>{palName}</Text>
            <Text style={styles.subtitle}>
              These actions are private. {palName} won’t be notified.
            </Text>

            <View style={styles.actionList}>
              {/* Report */}
              <Pressable
                style={styles.actionCard}
                onPress={() => setView("report")}
              >
                <View style={[styles.actionIcon, styles.reportIcon]}>
                  <Feather name="flag" size={18} color={REPORT_RED} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Report this person</Text>
                  <Text style={styles.actionSubtitle}>
                    Inappropriate content, spam, or harassment
                  </Text>
                </View>
              </Pressable>

              {/* Unmatch */}
              <Pressable style={styles.actionCard} onPress={handleUnmatchPress}>
                <View style={[styles.actionIcon, styles.unmatchIcon]}>
                  <Feather name="user-x" size={18} color={semantic.inkMuted} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Unmatch {palName}</Text>
                  <Text style={styles.actionSubtitle}>
                    End this conversation. You won’t be matched again.
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Block (less prominent) */}
            <Pressable style={styles.blockRow} onPress={handleBlockPress}>
              <Text style={styles.blockText}>Block {palName}</Text>
            </Pressable>

            <View style={styles.cancelWrap}>
              <Button full variant="ghost" onPress={onClose}>
                Never mind
              </Button>
            </View>
          </>
        ) : (
          <>
            <Pressable style={styles.backBtn} onPress={() => setView("main")}>
              <Feather
                name="arrow-left"
                size={18}
                color={semantic.inkMuted}
              />
            </Pressable>
            <Text style={styles.palName}>Report {palName}</Text>
            <Text style={styles.subtitle}>
              Tell us what happened. We review every report.
            </Text>

            <ScrollView
              contentContainerStyle={styles.reasonList}
              showsVerticalScrollIndicator={false}
            >
              {REPORT_REASONS.map((reason) => (
                <Chip
                  key={reason}
                  label={reason}
                  selected={reportReason === reason}
                  onPress={() => setReportReason(reason)}
                />
              ))}
            </ScrollView>

            <View style={styles.submitWrap}>
              <Button
                full
                disabled={!reportReason || submitting}
                onPress={handleSubmitReport}
              >
                {submitting ? "Sending…" : "Submit report"}
              </Button>
            </View>
          </>
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
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing[4],
    backgroundColor: semantic.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  palName: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    color: semantic.ink,
    textAlign: "center",
    marginTop: 4,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 13 * 1.5,
  },
  actionList: {
    gap: 10,
    marginTop: 20,
    marginHorizontal: 0,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 16,
    padding: 16,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  reportIcon: {
    backgroundColor: REPORT_RED_BG,
  },
  unmatchIcon: {
    backgroundColor: semantic.surface2,
  },
  actionTextCol: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    fontWeight: "500",
    color: semantic.ink,
  },
  actionSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    lineHeight: 13 * 1.4,
  },
  blockRow: {
    alignSelf: "center",
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  blockText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: REPORT_RED,
    fontWeight: "500",
  },
  cancelWrap: {
    marginTop: 12,
    marginBottom: spacing[6],
  },
  reasonList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: 20,
    paddingBottom: spacing[6],
  },
  submitWrap: {
    marginTop: "auto",
    paddingBottom: spacing[6],
  },
});
