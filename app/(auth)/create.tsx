import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { semantic, typography, spacing } from "@/theme/tokens";

export default function Create() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[2],
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.scale.xl,
    color: semantic.ink,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    color: semantic.inkMuted,
  },
});
