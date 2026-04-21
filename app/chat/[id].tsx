import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Animated,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Avatar } from "@/components/ui";
import AIFlagModal from "@/components/AIFlagModal";
import { semantic, colors, typography, spacing, radius } from "@/theme/tokens";

// ─── One-off semantic colors (not in main tokens) ──────────────────────────
const FLAG_AMBER = "#C4870A"; // warm amber for AI flag
const ACTIVE_GREEN = "#5CB065"; // green dot for online status

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  who: "me" | "them";
  text: string;
  time: string;
  aiFlag?: boolean;
}

// ─── Sample data per pal ────────────────────────────────────────────────────

const MIRA_MESSAGES: Message[] = [
  { id: "1", who: "them", text: "I\u2019ve been thinking about your last letter for days.\n\nThat line about tea cooling while you read \u2014 it caught me off guard. I think I do the same thing, and I\u2019d never named it.", time: "09:12" },
  { id: "2", who: "me", text: "It\u2019s funny. I almost didn\u2019t send that letter. I thought it was too small a thing to write about.", time: "09:24" },
  { id: "3", who: "them", text: "The small things are the point, I think. I\u2019m glad you sent it.", time: "09:31" },
  { id: "4", who: "them", text: "Here is a question I\u2019ve been sitting with:\n\nWhat is something you\u2019ve believed for a long time that you\u2019re starting to unbelieve?", time: "09:32", aiFlag: true },
  { id: "5", who: "me", text: "That I have to finish every book I start. I\u2019m learning to put them down.", time: "09:38" },
];

const GENERIC_MESSAGES: Message[] = [
  { id: "1", who: "them", text: "Hello! Really glad we were matched. I read your interests and I think we\u2019ll have plenty to talk about.", time: "10:00" },
  { id: "2", who: "me", text: "Same here! I noticed we both picked Literature. What are you reading right now?", time: "10:15" },
];

const PAL_INFO: Record<string, { city: string; localTime: string }> = {
  "1": { city: "Ljubljana", localTime: "3:31 PM" },
  "2": { city: "Kyoto", localTime: "10:31 PM" },
  "4": { city: "Copenhagen", localTime: "3:31 PM" },
  "5": { city: "Montreal", localTime: "9:31 AM" },
  "6": { city: "Beirut", localTime: "4:31 PM" },
};

const HEADER_HEIGHT = 88;

// ─── Component ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id, name, hue: hueParam } = useLocalSearchParams<{
    id: string;
    name?: string;
    hue?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const palName = name ?? "Pal";
  const palHue = hueParam ? parseInt(hueParam, 10) : undefined;
  const palInfo = PAL_INFO[id ?? ""] ?? { city: "Somewhere", localTime: "noon" };

  const [messages, setMessages] = useState<Message[]>(
    id === "1" ? MIRA_MESSAGES : GENERIC_MESSAGES
  );
  const [draft, setDraft] = useState("");
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [showPasteToast, setShowPasteToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Auto-scroll on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // ── Paste toast ──────────────────────────────────────────────────────────
  // TODO: Wire real paste detection via Clipboard listener or TextInput onPaste
  // For now, expose triggerPasteToast for testing.
  const triggerPasteToast = () => {
    setShowPasteToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowPasteToast(false));
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!draft.trim()) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), who: "me", text: draft.trim(), time: timeStr },
    ]);
    setDraft("");
  };

  const headerTop = insets.top;
  const composeBottomPad = insets.bottom + 10;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.messageList,
            { paddingTop: headerTop + HEADER_HEIGHT + spacing[5] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Encryption notice */}
          <View style={styles.encryptionPill}>
            <Feather name="lock" size={11} color={semantic.inkSoft} />
            <Text style={styles.encryptionText}>
              END-TO-END ENCRYPTED &middot; THOUGHTFUL REPLIES
            </Text>
          </View>

          {/* Messages */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onFlagPress={() => setAiModalVisible(true)}
            />
          ))}
        </ScrollView>

        {/* Compose bar */}
        <View style={[styles.composeBar, { paddingBottom: composeBottomPad }]}>
          <View style={styles.composeInner}>
            <RNTextInput
              style={styles.composeInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write something real\u2026"
              placeholderTextColor={semantic.inkSoft}
              multiline
              maxLength={5000}
            />
            <Pressable
              style={[
                styles.sendBtn,
                draft.trim()
                  ? styles.sendBtnActive
                  : styles.sendBtnInactive,
              ]}
              disabled={!draft.trim()}
              onPress={handleSend}
            >
              <Feather
                name="send"
                size={18}
                color={draft.trim() ? semantic.accentFg : semantic.inkSoft}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Header (absolute, blur) ──────────────────────────────────── */}
      <BlurView
        style={[styles.header, { paddingTop: headerTop }]}
        tint="light"
        intensity={60}
      >
        <View style={styles.headerInner}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
          </Pressable>

          <Avatar name={palName} size="sm" hue={palHue} />

          <View style={styles.headerCenter}>
            <Text style={styles.headerName} numberOfLines={1}>
              {palName}
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.activeDot} />
              <Text style={styles.statusText}>
                Writing in {palInfo.city} &middot; {palInfo.localTime} their time
              </Text>
            </View>
          </View>

          <Pressable style={styles.moreBtn} onPress={() => {}}>
            <Feather
              name="more-horizontal"
              size={20}
              color={semantic.inkMuted}
            />
          </Pressable>
        </View>
        <View style={styles.headerBorder} />
      </BlurView>

      {/* ── Paste toast ──────────────────────────────────────────────── */}
      {showPasteToast && (
        <Animated.View
          style={[
            styles.pasteToast,
            { bottom: composeBottomPad + 70, opacity: toastOpacity },
          ]}
        >
          <Text style={styles.pasteToastText}>
            Pasting is turned off — Palvelope works best with words written in
            the moment.
          </Text>
        </Animated.View>
      )}

      {/* ── AI explainer modal ───────────────────────────────────────── */}
      <AIFlagModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
      />
    </View>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onFlagPress,
}: {
  message: Message;
  onFlagPress: () => void;
}) {
  const isMe = message.who === "me";

  return (
    <View
      style={[
        styles.bubbleWrap,
        { alignItems: isMe ? "flex-end" : "flex-start" },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleThem,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isMe ? semantic.accentFg : semantic.ink },
          ]}
        >
          {message.text}
        </Text>
      </View>
      <Text
        style={[
          styles.bubbleTime,
          { alignSelf: isMe ? "flex-end" : "flex-start" },
        ]}
      >
        {message.time}
      </Text>

      {/* AI flag */}
      {message.aiFlag && (
        <Pressable style={styles.aiFlagRow} onPress={onFlagPress}>
          <Feather name="alert-triangle" size={12} color={FLAG_AMBER} />
          <Text style={styles.aiFlagText}>
            Language patterns suggest this message may be AI-assisted. Both of
            you can see this note.
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.bg,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: 10,
  },
  headerBorder: {
    height: 1,
    backgroundColor: semantic.ruleSoft,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing[4],
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
  },
  headerName: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    color: semantic.ink,
    letterSpacing: -0.16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: 1,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACTIVE_GREEN,
  },
  statusText: {
    fontFamily: typography.fontBody,
    fontSize: 11.5,
    color: semantic.inkSoft,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing[4],
    alignItems: "center",
    justifyContent: "center",
  },

  // Messages
  messageList: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  encryptionPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing[1],
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: spacing[1],
    marginBottom: spacing[6],
  },
  encryptionText: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    color: semantic.inkSoft,
  },

  // Bubbles
  bubbleWrap: {
    marginBottom: spacing[1],
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: semantic.accentInk,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.ruleSoft,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    lineHeight: 22,
  },
  bubbleTime: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.xs,
    color: semantic.inkSoft,
    marginTop: 2,
    marginBottom: spacing[2],
  },

  // AI flag
  aiFlagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: spacing[1],
    marginBottom: spacing[1],
    maxWidth: "78%",
  },
  aiFlagText: {
    fontFamily: typography.fontBody,
    fontSize: 11.5,
    color: FLAG_AMBER,
    lineHeight: 16,
    flex: 1,
  },

  // Compose
  composeBar: {
    backgroundColor: semantic.surface,
    borderTopWidth: 1,
    borderTopColor: semantic.ruleSoft,
    paddingHorizontal: spacing[4],
    paddingTop: 10,
  },
  composeInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  composeInput: {
    flex: 1,
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: 20,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    color: semantic.ink,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: semantic.accentInk,
  },
  sendBtnInactive: {
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
  },

  // Paste toast
  pasteToast: {
    position: "absolute",
    left: spacing[5],
    right: spacing[5],
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.rule,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: colors.paper[9],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  pasteToastText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.ink,
    textAlign: "center",
  },
});
