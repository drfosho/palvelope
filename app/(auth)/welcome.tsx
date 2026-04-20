import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark, Button } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <BrandMark size={36} />
        <Text style={styles.tagline}>Letters between friends</Text>
      </View>
      <View style={styles.bottom}>
        <Button full onPress={() => router.push("/(auth)/create")}>
          Create Account
        </Button>
        <Button
          variant="ghost"
          full
          onPress={() => router.push("/(auth)/sign-in")}
        >
          Sign In
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.bg,
    paddingHorizontal: spacing[6],
  },
  top: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[3],
  },
  tagline: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.md,
    color: semantic.inkMuted,
  },
  bottom: {
    gap: spacing[3],
    paddingBottom: spacing[8],
  },
});
