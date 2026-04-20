import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/ui";
import { semantic, typography, spacing } from "@/theme/tokens";

export default function Discover() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandMark size={24} />
      </View>
      <View style={styles.center}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Find new pen pals</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.bg,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
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
