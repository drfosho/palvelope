import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Button, Chip, TextInput } from "@/components/ui";
import { semantic, typography, spacing, radius } from "@/theme/tokens";
import {
  useOnboardingStore,
  type AnonymityLevel,
  type ReplyStyle,
} from "@/stores/onboardingStore";
import { supabase, updateProfile } from "@/lib/supabase";

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS = ["intro", "interests", "anonymity", "replyStyle", "region"] as const;
const TOTAL_STEPS = STEPS.length;

const INTERESTS = [
  "Philosophy", "Literature", "Music", "Travel", "Food & Cooking", "Film",
  "History", "Science", "Nature", "Art", "Languages", "Politics",
  "Mental Health", "Spirituality", "Sport", "Tech", "Fashion", "Architecture",
  "Parenting", "Gaming", "Sustainability", "Poetry", "Photography", "Medicine",
];
const MAX_INTERESTS = 6;
const MIN_INTERESTS = 2;

const ANONYMITY_OPTIONS: {
  key: AnonymityLevel;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
}[] = [
  {
    key: "anonymous",
    icon: "eye-off",
    title: "Fully anonymous",
    subtitle: "Only your interests and writing style are visible. No name, no location.",
  },
  {
    key: "pen_name",
    icon: "user",
    title: "Pen name only",
    subtitle: "Your chosen name is shown. Nothing else unless you share it.",
  },
  {
    key: "open",
    icon: "eye",
    title: "Open profile",
    subtitle: "Name, general region, and interests shown. Feels more like pen-pal tradition.",
  },
];

const REPLY_OPTIONS: {
  key: ReplyStyle;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
}[] = [
  {
    key: "quick",
    icon: "zap",
    title: "Quick back-and-forth",
    subtitle: "Short messages, fast replies. More like a conversation.",
  },
  {
    key: "thoughtful",
    icon: "coffee",
    title: "Thoughtful pace",
    subtitle: "A few paragraphs. I like to think before I reply.",
  },
  {
    key: "deep",
    icon: "moon",
    title: "Deep letters",
    subtitle: "Long-form. I might take a day or two. Quality over speed.",
  },
];

const REGIONS = [
  "Americas", "Europe", "Africa", "Middle East",
  "South Asia", "East Asia", "Southeast Asia", "Oceania",
];

const STEP_META: { title: string; subtitle: string }[] = [
  { title: "Your name", subtitle: "This is how your first letters will be signed." },
  { title: "What moves you", subtitle: "Pick a few \u2014 we match on the overlap, never on the obvious." },
  { title: "How should others see you", subtitle: "You can change this later, message by message." },
  { title: "How do you like to write", subtitle: "We\u2019ll match you with people who write at a similar rhythm." },
  { title: "Where in the world", subtitle: "Helps us find pen pals who are awake when you are." },
];

// ─── Step components (defined outside Onboarding to avoid remount) ──────────

function StepIntro({
  name,
  setName,
  showLocation,
  setShowLocation,
}: {
  name: string;
  setName: (v: string) => void;
  showLocation: boolean;
  setShowLocation: (v: boolean) => void;
}) {
  return (
    <View style={styles.stepContent}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Mira, T.J., The Wanderer"
        autoCapitalize="words"
      />
      <Text style={styles.helperText}>
        You can use a nickname or pen name — real name not required.
      </Text>

      <View style={styles.toggleRow}>
        <View style={styles.toggleTextCol}>
          <Text style={styles.monoLabel}>SHOW YOUR LOCATION ON PROFILE?</Text>
          <Text style={styles.helperText}>
            e.g. "Somewhere in California" — never your exact address.
          </Text>
        </View>
        <Switch
          value={showLocation}
          onValueChange={setShowLocation}
          trackColor={{ false: semantic.rule, true: semantic.accentInk }}
          thumbColor={semantic.accentFg}
        />
      </View>
    </View>
  );
}

function StepInterests({
  interests,
  toggleInterest,
}: {
  interests: string[];
  toggleInterest: (interest: string) => void;
}) {
  const atMax = interests.length >= MAX_INTERESTS;
  return (
    <View style={styles.stepContent}>
      <View style={styles.chipWrap}>
        {INTERESTS.map((interest) => {
          const selected = interests.includes(interest);
          const dimmed = atMax && !selected;
          return (
            <Chip
              key={interest}
              label={interest}
              selected={selected}
              disabled={dimmed}
              onPress={() => toggleInterest(interest)}
            />
          );
        })}
      </View>
      <Text style={styles.helperText}>
        {interests.length} of {MAX_INTERESTS} selected
      </Text>
    </View>
  );
}

function StepAnonymity({
  anonymity,
  setAnonymity,
}: {
  anonymity: AnonymityLevel;
  setAnonymity: (v: AnonymityLevel) => void;
}) {
  return (
    <View style={styles.stepContent}>
      {ANONYMITY_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.key}
          icon={opt.icon}
          title={opt.title}
          subtitle={opt.subtitle}
          selected={anonymity === opt.key}
          onPress={() => setAnonymity(opt.key)}
        />
      ))}
    </View>
  );
}

function StepReplyStyle({
  replyStyle,
  setReplyStyle,
}: {
  replyStyle: ReplyStyle;
  setReplyStyle: (v: ReplyStyle) => void;
}) {
  return (
    <View style={styles.stepContent}>
      {REPLY_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.key}
          icon={opt.icon}
          title={opt.title}
          subtitle={opt.subtitle}
          selected={replyStyle === opt.key}
          onPress={() => setReplyStyle(opt.key)}
        />
      ))}
    </View>
  );
}

function StepRegion({
  homeRegion,
  setHomeRegion,
  targetRegions,
  toggleTargetRegion,
}: {
  homeRegion: string | null;
  setHomeRegion: (v: string) => void;
  targetRegions: string[];
  toggleTargetRegion: (v: string) => void;
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.monoLabel}>I'M BASED IN</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizChipRow}
      >
        {REGIONS.map((region) => (
          <Chip
            key={region}
            label={region}
            selected={homeRegion === region}
            onPress={() => setHomeRegion(region)}
          />
        ))}
      </ScrollView>

      <View style={{ height: spacing[5] }} />

      <Text style={styles.monoLabel}>I'D LOVE TO HEAR FROM</Text>
      <View style={styles.chipWrap}>
        {["Anywhere", ...REGIONS].map((region) => (
          <Chip
            key={region}
            label={region}
            selected={targetRegions.includes(region)}
            onPress={() => toggleTargetRegion(region)}
          />
        ))}
      </View>
    </View>
  );
}

function OptionCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.optionCard,
        selected ? styles.optionCardSelected : styles.optionCardDefault,
      ]}
      onPress={onPress}
    >
      <View style={styles.optionIcon}>
        <Feather
          name={icon}
          size={22}
          color={selected ? semantic.accentInk : semantic.inkMuted}
        />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function Onboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const store = useOnboardingStore();

  // ─── Session guard ────────────────────────────────────────────────────

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.warn(
          "No session on onboarding screen — redirecting to welcome"
        );
        router.replace("/(auth)/welcome");
      }
    };
    checkSession();
  }, []);

  // ─── Step transition ──────────────────────────────────────────────────

  const animateToStep = useCallback(
    (next: number) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(next);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim]
  );

  const goBack = () => {
    if (currentStep === 0) {
      router.back();
    } else {
      animateToStep(currentStep - 1);
    }
  };

  // ─── Final step: save and navigate ────────────────────────────────────

  const handleComplete = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.error("No session on handleComplete");
        Alert.alert("Session error", "Please sign in again.");
        router.replace("/(auth)/welcome");
        return;
      }

      const user = session.user;
      const storeData = useOnboardingStore.getState().getData();

      const { error: profileError } = await updateProfile({
        id: user.id,
        display_name: storeData.name,
        interests: storeData.interests,
        anonymity_level: storeData.anonymity,
        reply_style: storeData.replyStyle,
        home_region: storeData.homeRegion,
        target_regions: storeData.targetRegions,
        show_location: storeData.showLocation,
        onboarding_complete: true,
      });

      if (profileError) {
        console.error("Profile update error:", profileError);
        Alert.alert(
          "Something went wrong",
          "Could not save your profile. Please try again."
        );
        setLoading(false);
        return;
      }

      const { error: metaError } = await supabase.auth.updateUser({
        data: { onboarding_complete: true },
      });

      if (metaError) {
        console.error("Metadata update error:", metaError);
      }

      router.replace("/(tabs)/discover");
    } catch (e) {
      console.error("handleComplete exception:", e);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const goNext = async () => {
    if (currentStep < TOTAL_STEPS - 1) {
      animateToStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  // ─── Can continue logic ───────────────────────────────────────────────

  const canContinue = (() => {
    switch (currentStep) {
      case 0:
        return store.name.trim().length >= 2;
      case 1:
        return store.interests.length >= MIN_INTERESTS;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return store.homeRegion !== null;
      default:
        return false;
    }
  })();

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  // ─── Interest toggle ──────────────────────────────────────────────────

  const toggleInterest = useCallback(
    (interest: string) => {
      const current = store.interests;
      if (current.includes(interest)) {
        store.setInterests(current.filter((i) => i !== interest));
      } else if (current.length < MAX_INTERESTS) {
        store.setInterests([...current, interest]);
      }
    },
    [store]
  );

  // ─── Target region toggle ─────────────────────────────────────────────

  const toggleTargetRegion = useCallback(
    (region: string) => {
      const current = store.targetRegions;
      if (region === "Anywhere") {
        store.setTargetRegions(["Anywhere"]);
      } else {
        const withoutAnywhere = current.filter((r) => r !== "Anywhere");
        if (withoutAnywhere.includes(region)) {
          const next = withoutAnywhere.filter((r) => r !== region);
          store.setTargetRegions(next.length === 0 ? ["Anywhere"] : next);
        } else {
          store.setTargetRegions([...withoutAnywhere, region]);
        }
      }
    },
    [store]
  );

  // ─── Render step content ──────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepIntro
            name={store.name}
            setName={store.setName}
            showLocation={store.showLocation}
            setShowLocation={store.setShowLocation}
          />
        );
      case 1:
        return (
          <StepInterests
            interests={store.interests}
            toggleInterest={toggleInterest}
          />
        );
      case 2:
        return (
          <StepAnonymity
            anonymity={store.anonymity}
            setAnonymity={store.setAnonymity}
          />
        );
      case 3:
        return (
          <StepReplyStyle
            replyStyle={store.replyStyle}
            setReplyStyle={store.setReplyStyle}
          />
        );
      case 4:
        return (
          <StepRegion
            homeRegion={store.homeRegion}
            setHomeRegion={store.setHomeRegion}
            targetRegions={store.targetRegions}
            toggleTargetRegion={toggleTargetRegion}
          />
        );
      default:
        return null;
    }
  };

  // ─── Main render ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header: back + progress */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={goBack}>
            <Feather name="arrow-left" size={20} color={semantic.inkMuted} />
          </Pressable>
          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  {
                    backgroundColor:
                      i <= currentStep ? semantic.accentInk : semantic.rule,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{STEP_META[currentStep].title}</Text>
          <Text style={styles.subtitle}>
            {STEP_META[currentStep].subtitle}
          </Text>

          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {renderStep()}
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <Button full disabled={!canContinue || loading} onPress={goNext}>
            {loading
              ? "Saving\u2026"
              : isLastStep
                ? "Find my first pal"
                : "Continue"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: semantic.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    gap: spacing[4],
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing[4],
    backgroundColor: semantic.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: { flexDirection: "row", gap: spacing[1] },
  progressBar: { flex: 1, height: 3, borderRadius: 2 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    fontWeight: "400",
    color: semantic.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14.5,
    color: semantic.inkMuted,
    marginTop: spacing[2],
    lineHeight: 22,
  },
  stepContent: { marginTop: spacing[6], gap: spacing[3] },
  helperText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: semantic.inkSoft,
    lineHeight: 17,
  },
  monoLabel: {
    fontFamily: MONO_FONT,
    fontSize: typography.scale.xs,
    fontWeight: "500",
    color: semantic.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: spacing[4],
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.ruleSoft,
    borderRadius: radius.md,
    padding: spacing[4],
  },
  toggleTextCol: { flex: 1, gap: spacing[1] },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  horizChipRow: { gap: spacing[2], paddingVertical: spacing[1] },
  bottom: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
    paddingTop: spacing[2],
  },
  optionCard: {
    flexDirection: "row",
    borderRadius: spacing[4],
    padding: spacing[4],
    gap: spacing[4],
    alignItems: "center",
  },
  optionCardDefault: {
    backgroundColor: semantic.surface2,
    borderWidth: 1,
    borderColor: semantic.ruleSoft,
  },
  optionCardSelected: {
    backgroundColor: semantic.accentSoft,
    borderWidth: 1.5,
    borderColor: semantic.accentInk,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: semantic.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    fontWeight: "500",
    color: semantic.ink,
  },
  optionSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.sm,
    color: semantic.inkMuted,
    lineHeight: 18,
  },
});
