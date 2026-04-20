import { Stack } from "expo-router";
import { semantic } from "@/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: semantic.bg },
      }}
    />
  );
}
