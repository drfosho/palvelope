import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { semantic, typography, spacing } from "@/theme/tokens";

export default function Letters() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Letters</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.empty}>No letters yet</Text>
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
  headerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.scale.lg,
    color: semantic.ink,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    fontFamily: typography.fontBody,
    fontSize: typography.scale.base,
    color: semantic.inkSoft,
  },
});
