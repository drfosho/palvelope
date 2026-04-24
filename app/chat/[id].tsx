import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Modal,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Avatar, Button } from "@/components/ui";
import AIFlagModal from "@/components/AIFlagModal";
import SAMPLE_PALS from "@/data/samplePals";
import type { ReplyStyle } from "@/stores/onboardingStore";
import { semantic, colors, typography, spacing, radius } from "@/theme/tokens";
import {
  supabase,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getProfile,
  type Message,
  type Profile,
} from "@/lib/supabase";

// ─── One-off semantic colors (not in main tokens) ──────────────────────────
const FLAG_AMBER = "#C4870A"; // warm amber for AI flag
const ACTIVE_GREEN = "#5CB065"; // green dot for online status
const REVEAL_GREEN = "#2F8A4F"; // ≈ oklch(0.40 0.12 150), reveal success check

// ─── Local-mode sender markers (used when palId is not a real UUID) ─────────
const LOCAL_ME = "__local_me";
const LOCAL_THEM = "__local_them";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Sample data per pal (local-mode fallback) ──────────────────────────────

function localMessage(
  id: string,
  isMe: boolean,
  content: string,
  hhmm: string,
  aiFlag = false
): Message {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return {
    id,
    conversation_id: "__local__",
    sender_id: isMe ? LOCAL_ME : LOCAL_THEM,
    content,
    created_at: d.toISOString(),
    read_at: null,
    ai_flagged: aiFlag,
    ai_flag_reason: null,
  };
}

const MIRA_MESSAGES: Message[] = [
  localMessage(
    "1",
    false,
    "I’ve been thinking about your last letter for days.\n\nThat line about tea cooling while you read — it caught me off guard. I think I do the same thing, and I’d never named it.",
    "09:12"
  ),
  localMessage(
    "2",
    true,
    "It’s funny. I almost didn’t send that letter. I thought it was too small a thing to write about.",
    "09:24"
  ),
  localMessage(
    "3",
    false,
    "The small things are the point, I think. I’m glad you sent it.",
    "09:31"
  ),
  localMessage(
    "4",
    false,
    "Here is a question I’ve been sitting with:\n\nWhat is something you’ve believed for a long time that you’re starting to unbelieve?",
    "09:32",
    true
  ),
  localMessage(
    "5",
    true,
    "That I have to finish every book I start. I’m learning to put them down.",
    "09:38"
  ),
];

const OPENER_PROMPTS: string[] = [
  "What’s something small that made your day better recently?",
  "What’s something you’ve been thinking about lately that you haven’t said out loud yet?",
  "Is there something you used to believe that you’ve quietly stopped believing?",
  "What does your ideal slow morning look like?",
  "What’s a place you’ve been that changed how you see things?",
  "What are you in the middle of right now — a book, a project, a decision?",
  "What’s something you’re quietly proud of that most people don’t know about?",
  "What kind of person do you find it easiest to talk to?",
  "What’s something you do differently than most people you know?",
  "What would you want a pen pal to know about you before your first letter?",
];

const REPLY_STYLE_PROMPT_INDEX: Record<ReplyStyle, number> = {
  quick: 0,
  thoughtful: 1,
  deep: 2,
};

const REPLY_STYLE_LABEL: Record<ReplyStyle, string> = {
  quick: "Quick replies",
  thoughtful: "Thoughtful pace",
  deep: "Deep letters",
};

const PAL_INFO: Record<string, { city: string; localTime: string }> = {
  "1": { city: "Ljubljana", localTime: "3:31 PM" },
  "2": { city: "Kyoto", localTime: "10:31 PM" },
  "4": { city: "Copenhagen", localTime: "3:31 PM" },
  "5": { city: "Montreal", localTime: "9:31 AM" },
  "6": { city: "Beirut", localTime: "4:31 PM" },
};

const HEADER_HEIGHT = 88;

// ─── Reveal items config ────────────────────────────────────────────────────

type RevealKey = "name" | "region" | "interests" | "pace";

interface RevealItem {
  key: RevealKey;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  getValue: (p: Profile | null) => string;
}

const REVEAL_ITEMS: RevealItem[] = [
  {
    key: "name",
    icon: "user",
    label: "Your display name",
    getValue: (p) => p?.display_name ?? "Hidden",
  },
  {
    key: "region",
    icon: "map-pin",
    label: "Your region",
    getValue: (p) => p?.home_region ?? "Hidden",
  },
  {
    key: "interests",
    icon: "book-open",
    label: "Your interests",
    getValue: (p) =>
      p?.interests && p.interests.length > 0
        ? p.interests.join(", ")
        : "Tap to share your interest list",
  },
  {
    key: "pace",
    icon: "coffee",
    label: "Your writing pace",
    getValue: (p) =>
      p?.reply_style ? REPLY_STYLE_LABEL[p.reply_style] : "Hidden",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id, name, hue: hueParam } = useLocalSearchParams<{
    id: string;
    name?: string;
    hue?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const palId = typeof id === "string" ? id : "";
  const palName = name ?? "Pal";
  const palHue = hueParam ? parseInt(hueParam, 10) : undefined;
  const palInfo = PAL_INFO[palId] ?? { city: "Somewhere", localTime: "noon" };

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [localMode, setLocalMode] = useState(false);

  const [draft, setDraft] = useState("");
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [showPasteToast, setShowPasteToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // ── Opener / nudges state ───────────────────────────────────────────────
  const pal = SAMPLE_PALS.find((p) => p.id === palId);
  const palReplyStyle: ReplyStyle = pal?.replyStyle ?? "thoughtful";
  const [openerDismissed, setOpenerDismissed] = useState(false);
  const [promptIndex, setPromptIndex] = useState<number>(
    REPLY_STYLE_PROMPT_INDEX[palReplyStyle]
  );
  const [dismissedNudges, setDismissedNudges] = useState<number[]>([]);
  const composeInputRef = useRef<RNTextInput>(null);

  // ── Reveal state ────────────────────────────────────────────────────────
  const [revealSheetVisible, setRevealSheetVisible] = useState(false);
  const [revealedItems, setRevealedItems] = useState<Set<RevealKey>>(
    () => new Set()
  );

  const isNewConversation =
    messages.length === 0 && !loading && !openerDismissed;
  const currentPrompt = OPENER_PROMPTS[promptIndex];

  const myMessageCount = useMemo(
    () =>
      messages.filter((m) =>
        localMode
          ? m.sender_id === LOCAL_ME
          : currentUserId !== null && m.sender_id === currentUserId
      ).length,
    [messages, currentUserId, localMode]
  );
  const activeNudge: 1 | 2 | null = (() => {
    if (myMessageCount === 1 && !dismissedNudges.includes(1)) return 1;
    if (myMessageCount === 2 && !dismissedNudges.includes(2)) return 2;
    return null;
  })();

  // ── Setup: load session, conversation, messages, subscribe ───────────────
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (cancelled) return;
        console.warn(
          "[chat] no session — falling back to local Mira messages"
        );
        setLocalMode(true);
        setMessages(palId === "1" ? MIRA_MESSAGES : []);
        setLoading(false);
        return;
      }
      if (cancelled) return;
      setCurrentUserId(session.user.id);

      // Best-effort fetch of current user profile for reveal display
      getProfile(session.user.id)
        .then((p) => {
          if (!cancelled) setCurrentUserProfile(p);
        })
        .catch(() => {});

      // If palId isn't a UUID, skip Supabase entirely — we're in sample land
      if (!UUID_RE.test(palId)) {
        console.warn(
          "[chat] palId is not a UUID, using local-only mode:",
          palId
        );
        setLocalMode(true);
        setMessages(palId === "1" ? MIRA_MESSAGES : []);
        setLoading(false);
        return;
      }

      const convoId = await getOrCreateConversation(session.user.id, palId);
      if (cancelled) return;
      if (!convoId) {
        console.warn(
          "[chat] getOrCreateConversation returned null — local mode"
        );
        setLocalMode(true);
        setMessages(palId === "1" ? MIRA_MESSAGES : []);
        setLoading(false);
        return;
      }

      setConversationId(convoId);

      const existing = await getMessages(convoId);
      if (cancelled) return;
      setMessages(existing as Message[]);
      setLoading(false);

      // Subscribe to new messages via Realtime
      channel = supabase
        .channel(`conversation:${convoId}`)
        .on(
          "postgres_changes" as any,
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${convoId}`,
          },
          (payload: any) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            requestAnimationFrame(() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            );
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [palId]);

  // Auto-scroll on messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleShufflePrompt = () => {
    setPromptIndex((i) => (i + 1) % OPENER_PROMPTS.length);
  };

  const handleUsePrompt = () => {
    setDraft(currentPrompt);
    setOpenerDismissed(true);
    setTimeout(() => {
      composeInputRef.current?.focus();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const handleWriteOwn = () => {
    setOpenerDismissed(true);
    setTimeout(() => composeInputRef.current?.focus(), 50);
  };

  const dismissNudge = (which: 1 | 2) => {
    setDismissedNudges((prev) =>
      prev.includes(which) ? prev : [...prev, which]
    );
  };

  // ── Paste toast ──────────────────────────────────────────────────────────
  // TODO: Wire real paste detection via Clipboard listener or TextInput onPaste
  const triggerPasteToast = () => {
    setShowPasteToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(3500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowPasteToast(false));
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim()) return;
    const content = draft.trim();
    setDraft("");

    // Local-mode (sample pal / no session): optimistic add, no network
    if (localMode || !conversationId || !currentUserId) {
      const optimistic: Message = {
        id: `local-${Date.now()}`,
        conversation_id: conversationId ?? "__local__",
        sender_id: localMode ? LOCAL_ME : currentUserId ?? LOCAL_ME,
        content,
        created_at: new Date().toISOString(),
        read_at: null,
        ai_flagged: false,
        ai_flag_reason: null,
      };
      setMessages((prev) => [...prev, optimistic]);
      requestAnimationFrame(() =>
        scrollViewRef.current?.scrollToEnd({ animated: true })
      );
      return;
    }

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
      ai_flagged: false,
      ai_flag_reason: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() =>
      scrollViewRef.current?.scrollToEnd({ animated: true })
    );

    const { data, error } = await sendMessage(
      conversationId,
      currentUserId,
      content
    );
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      console.error("Send failed:", error);
    } else if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? (data as Message) : m))
      );
    }
  };

  const toggleReveal = (key: RevealKey) => {
    setRevealedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    // TODO: wire sharing logic — send a system message or update a
    // shared_reveals table so the pal can see what has been revealed.
  };

  const revealedLabels = REVEAL_ITEMS.filter((i) => revealedItems.has(i.key))
    .map((i) => i.label.replace(/^Your /, ""))
    .join(", ");

  const headerTop = insets.top;
  const composeBottomPad = insets.bottom + 10;

  const isMessageMine = (m: Message) =>
    localMode
      ? m.sender_id === LOCAL_ME
      : currentUserId !== null && m.sender_id === currentUserId;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View
            style={[
              styles.loadingWrap,
              { paddingTop: headerTop + HEADER_HEIGHT },
            ]}
          >
            <ActivityIndicator color={semantic.accent} />
          </View>
        ) : isNewConversation ? (
          <OpenerPanel
            palName={palName}
            palHue={palHue}
            prompt={currentPrompt}
            onShuffle={handleShufflePrompt}
            onUsePrompt={handleUsePrompt}
            onWriteOwn={handleWriteOwn}
            headerTop={headerTop}
          />
        ) : (
          <ScrollView
            ref={scrollViewRef}
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

            {/* Shared reveals card */}
            {revealedItems.size > 0 && (
              <View style={styles.revealedCard}>
                <Feather name="unlock" size={12} color={semantic.accentInk} />
                <Text style={styles.revealedText} numberOfLines={2}>
                  You’ve shared: {revealedLabels}
                </Text>
              </View>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMe={isMessageMine(msg)}
                onFlagPress={() => setAiModalVisible(true)}
              />
            ))}
          </ScrollView>
        )}

        {/* Quality nudge */}
        {!isNewConversation && !loading && activeNudge !== null && (
          <NudgeBar
            kind={activeNudge}
            onDismiss={() => dismissNudge(activeNudge)}
          />
        )}

        {/* Compose bar */}
        {!isNewConversation && !loading && (
          <View style={[styles.composeBar, { paddingBottom: composeBottomPad }]}>
            <View style={styles.composeInner}>
              <RNTextInput
                ref={composeInputRef}
                style={styles.composeInput}
                value={draft}
                onChangeText={setDraft}
                placeholder="Write something real…"
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
        )}
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

          <Pressable
            style={styles.shareBtn}
            onPress={() => setRevealSheetVisible(true)}
            hitSlop={6}
          >
            <Feather name="unlock" size={13} color={semantic.inkMuted} />
          </Pressable>

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

      {/* ── Reveal sheet ─────────────────────────────────────────────── */}
      <RevealSheet
        visible={revealSheetVisible}
        onClose={() => setRevealSheetVisible(false)}
        profile={currentUserProfile}
        revealedItems={revealedItems}
        onToggle={toggleReveal}
      />
    </View>
  );
}

// ─── Opener Panel ───────────────────────────────────────────────────────────

function OpenerPanel({
  palName,
  palHue,
  prompt,
  onShuffle,
  onUsePrompt,
  onWriteOwn,
  headerTop,
}: {
  palName: string;
  palHue: number | undefined;
  prompt: string;
  onShuffle: () => void;
  onUsePrompt: () => void;
  onWriteOwn: () => void;
  headerTop: number;
}) {
  return (
    <View
      style={[
        styles.openerWrap,
        { paddingTop: headerTop + HEADER_HEIGHT + spacing[4] },
      ]}
    >
      <View style={styles.openerTop}>
        <Avatar name={palName} size="md" hue={palHue} />
        <Text style={styles.openerPalName}>{palName}</Text>
        <Text style={styles.openerCaption}>Start your first letter</Text>
      </View>

      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>A GOOD PLACE TO START</Text>
        <Text style={styles.promptText}>{prompt}</Text>
        <Pressable style={styles.shuffleBtn} onPress={onShuffle}>
          <Feather name="refresh-cw" size={13} color={semantic.accent} />
          <Text style={styles.shuffleText}>Try another prompt</Text>
        </Pressable>
      </View>

      <View style={styles.usePromptWrap}>
        <Button full onPress={onUsePrompt}>
          Use this prompt →
        </Button>
      </View>

      <Pressable onPress={onWriteOwn} style={styles.writeOwnBtn}>
        <Text style={styles.writeOwnText}>Write your own instead</Text>
      </Pressable>
    </View>
  );
}

// ─── Nudge Bar ──────────────────────────────────────────────────────────────

function NudgeBar({
  kind,
  onDismiss,
}: {
  kind: 1 | 2;
  onDismiss: () => void;
}) {
  const icon: React.ComponentProps<typeof Feather>["name"] =
    kind === 1 ? "zap" : "message-circle";
  const text =
    kind === 1
      ? "Good start. Try ending with a question — it keeps the conversation alive."
      : "You’re doing great. The best pen pals share one small personal detail per letter.";

  return (
    <View style={styles.nudgeBar}>
      <Feather name={icon} size={14} color={semantic.accentInk} />
      <Text style={styles.nudgeText}>{text}</Text>
      <Pressable onPress={onDismiss} hitSlop={8} style={styles.nudgeDismiss}>
        <Feather name="x" size={12} color={semantic.inkSoft} />
      </Pressable>
    </View>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isMe,
  onFlagPress,
}: {
  message: Message;
  isMe: boolean;
  onFlagPress: () => void;
}) {
  return (
    <View
      style={[
        styles.bubbleWrap,
        { alignItems: isMe ? "flex-end" : "flex-start" },
      ]}
    >
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text
          style={[
            styles.bubbleText,
            { color: isMe ? semantic.accentFg : semantic.ink },
          ]}
        >
          {message.content}
        </Text>
      </View>
      <Text
        style={[
          styles.bubbleTime,
          { alignSelf: isMe ? "flex-end" : "flex-start" },
        ]}
      >
        {formatTime(message.created_at)}
      </Text>

      {/* AI flag */}
      {message.ai_flagged && (
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

// ─── Reveal Sheet ───────────────────────────────────────────────────────────

function RevealSheet({
  visible,
  onClose,
  profile,
  revealedItems,
  onToggle,
}: {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null;
  revealedItems: Set<RevealKey>;
  onToggle: (key: RevealKey) => void;
}) {
  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Share a little more</Text>
        <Text style={styles.sheetSubtitle}>
          Choose what to reveal. You can always share more later.
        </Text>

        <View style={styles.revealList}>
          {REVEAL_ITEMS.map((item) => {
            const revealed = revealedItems.has(item.key);
            return (
              <Pressable
                key={item.key}
                style={styles.revealRow}
                onPress={() => onToggle(item.key)}
              >
                <Feather
                  name={item.icon}
                  size={16}
                  color={semantic.accentInk}
                />
                <View style={styles.revealRowMid}>
                  <Text style={styles.revealLabel}>{item.label}</Text>
                  <Text style={styles.revealValue} numberOfLines={1}>
                    {item.getValue(profile)}
                  </Text>
                </View>
                {revealed ? (
                  <Feather
                    name="check-circle"
                    size={14}
                    color={REVEAL_GREEN}
                  />
                ) : (
                  <Feather
                    name="chevron-right"
                    size={14}
                    color={semantic.inkSoft}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sheetFooter}>
          <Button full variant="ghost" onPress={onClose}>
            Done
          </Button>
        </View>
      </View>
    </Modal>
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
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  shareBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.rule,
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

  // Revealed card
  revealedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: semantic.surface2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  revealedText: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkMuted,
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

  // Opener panel
  openerWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[6],
  },
  openerTop: {
    alignItems: "center",
  },
  openerPalName: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    color: semantic.ink,
    marginTop: spacing[2],
  },
  openerCaption: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    marginTop: spacing[1],
  },
  promptCard: {
    backgroundColor: semantic.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: spacing[6],
    ...Platform.select({
      ios: {
        shadowColor: colors.paper[9],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  promptLabel: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  promptText: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    color: semantic.ink,
    lineHeight: 17 * 1.6,
    marginTop: spacing[2],
  },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: spacing[3],
    paddingVertical: spacing[1],
  },
  shuffleText: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.accent,
    fontWeight: "500",
  },
  usePromptWrap: {
    marginTop: spacing[4],
  },
  writeOwnBtn: {
    alignSelf: "center",
    marginTop: spacing[3],
    paddingVertical: spacing[1],
  },
  writeOwnText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.accentInk,
  },

  // Nudge bar
  nudgeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: semantic.surface2,
    borderTopWidth: 1,
    borderTopColor: semantic.ruleSoft,
    paddingHorizontal: spacing[5],
    paddingVertical: 10,
  },
  nudgeText: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    lineHeight: 13 * 1.4,
  },
  nudgeDismiss: {
    padding: 2,
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

  // Reveal sheet
  sheetContainer: {
    flex: 1,
    backgroundColor: semantic.bg,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: semantic.rule,
    marginBottom: spacing[4],
  },
  sheetTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    color: semantic.ink,
  },
  sheetSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
    marginTop: spacing[1],
  },
  revealList: {
    marginTop: 20,
    gap: 10,
  },
  revealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: semantic.surface2,
    borderRadius: 14,
    padding: 14,
  },
  revealRowMid: {
    flex: 1,
    gap: 2,
  },
  revealLabel: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: semantic.ink,
  },
  revealValue: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: semantic.inkMuted,
  },
  sheetFooter: {
    marginTop: "auto",
    paddingBottom: spacing[6],
    paddingTop: spacing[4],
  },
});
