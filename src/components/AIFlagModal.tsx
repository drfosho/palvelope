import React from "react";
import { View, Text, Modal, StyleSheet, Platform } from "react-native";
import { Button } from "@/components/ui";
import { semantic, colors, typography, spacing, radius } from "@/theme/tokens";

interface AIFlagModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AIFlagModal({ visible, onClose }: AIFlagModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      onRequestClose={onClose}
      transparent={Platform.OS !== "ios"}
    >
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        <Text style={styles.title}>About this signal</Text>

        <Text style={styles.body}>
          Palvelope checks writing patterns in the background. When a message
          looks like it may have been written or heavily edited by AI, both
          people in the conversation see this small note.
        </Text>
        <Text style={styles.body}>
          It's not an accusation — it's a signal. Some people use AI to help
          with phrasing, and that's okay. But we think you deserve to know.
        </Text>
        <Text style={styles.body}>
          This note is private to your conversation.
        </Text>

        <View style={styles.btnWrap}>
          <Button variant="ghost" full onPress={onClose}>
            Got it
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: semantic.bg,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.paper[3],
    alignSelf: "center",
    marginBottom: spacing[8],
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    fontWeight: "400",
    color: semantic.ink,
    marginBottom: spacing[5],
  },
  body: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    color: semantic.inkMuted,
    lineHeight: 24,
    marginBottom: spacing[4],
  },
  btnWrap: {
    marginTop: spacing[6],
  },
});
