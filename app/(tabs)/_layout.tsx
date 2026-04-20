import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { semantic, typography } from "@/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: semantic.accent,
        tabBarInactiveTintColor: semantic.inkSoft,
        tabBarStyle: {
          backgroundColor: semantic.surface,
          borderTopColor: semantic.ruleSoft,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontBody,
          fontSize: typography.scale.xs,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="letters"
        options={{
          title: "Letters",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
