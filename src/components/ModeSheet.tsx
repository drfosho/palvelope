import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";
import { proposeMode, type ConversationMode } from "@/lib/supabase";

interface ModeOption {
  key: ConversationMode;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    key: "live",
    icon: "zap",
    title: "Live",
    description:
      "Short messages, fast replies. More like a real conversation.",
  },
  {
    key: "thoughtful",
    icon: "coffee",
    title: "Thoughtful",
    description: "A few paragraphs. Think before you reply.",
  },
  {
    key: "letterlike",
    icon: "moon",
    title: "Letterlike",
    description:
      "Long-form letters. A day or two between replies is normal.",
  },
];

interface ModeSheetProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string | null;
  currentMode: ConversationMode;
  currentUserId: string | null;
  palName: string;
}

export default function ModeSheet({
  visible,
  onClose,
  conversationId,
  currentMode,
  currentUserId,
  palName,
}: ModeSheetProps) {
  const [selected, setSelected] = useState<ConversationMode>(currentMode);
  const [submitting, setSubmitting] = useState(false);
  const [submittedMode, setSubmittedMode] = useState<ConversationMode | null>(
    null
  );

  useEffect(() => {
    if (visible) {
      setSelected(currentMode);
      setSubmittedMode(null);
    }
  }, [visible, currentMode]);

  const handleSuggest = async () => {
    if (!conversationId || !currentUserId) return;
    if (selected === currentMode) return;
    setSubmitting(true);
    const { error } = await proposeMode(
      conversationId,
      currentUserId,
      selected
    );
    setSubmitting(false);
    if (error) {
      console.error("[mode] propose error:", error);
      return;
    }
    setSubmittedMode(selected);
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
        <Text style={styles.title}>Conversation pace</Text>
        <Text style={styles.subtitle}>
          Both of you agreed to this pace. Suggest a change anytime.
        </Text>

        <View style={styles.list}>
          {MODE_OPTIONS.map((opt) => {
            const isCurrent = opt.key === currentMode;
            const isSelected = opt.key === selected;
            return (
              <Pressable
                key={opt.key}
                style={[
                  styles.card,
                  isSelected ? styles.cardSelected : styles.cardDefault,
                ]}
                onPress={() => setSelected(opt.key)}
                disabled={submitting}
              >
                <View style={styles.iconWrap}>
                  <Feather
                    name={opt.icon}
                    size={20}
                    color={semantic.accentInk}
                  />
                </View>
                <View style={styles.cardText}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>{opt.title}</Text>
                    {isCurrent && (
                      <View style={styles.currentTag}>
                        <Text style={styles.currentTagText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardDescription}>{opt.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {submittedMode ? (
          <View style={styles.confirmation}>
            <Feather
              name="check-circle"
              size={14}
              color={semantic.accentInk}
            />
            <Text style={styles.confirmationText}>
              Your suggestion was sent. Waiting for {palName} to accept.
            </Text>
          </View>
        ) : (
          <View style={styles.cta}>
            <Button
              full
              disabled={selected === currentMode || submitting}
              onPress={handleSuggest}
            >
              {submitting ? "Sending…" : "Suggest this pace"}
            </Button>
          </View>
        )}

        <View style={styles.cancelWrap}>
          <Button full variant="ghost" onPress={onClose}>
            Close
          </Button>
        </View>
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
  list: {
    marginTop: 20,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 14,
  },
  cardDefault: {
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.rule,
  },
  cardSelected: {
    backgroundColor: semantic.accentSoft,
    borderWidth: 1.5,
    borderColor: semantic.accentInk,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: semantic.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    fontWeight: "500",
    color: semantic.ink,
  },
  currentTag: {
    backgroundColor: semantic.surface2,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentTagText: {
    fontFamily: typography.fontBody,
    fontSize: 10,
    fontWeight: "500",
    color: semantic.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardDescription: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    lineHeight: 13 * 1.4,
  },
  cta: {
    marginTop: 20,
  },
  confirmation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: semantic.accentSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  confirmationText: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.accentInk,
    lineHeight: 13 * 1.4,
  },
  cancelWrap: {
    marginTop: "auto",
    paddingBottom: spacing[6],
  },
});
