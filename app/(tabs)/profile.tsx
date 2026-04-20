import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";

export default function Profile() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Avatar name="Guest" size="lg" />
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Sign in to get started</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[3],
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
