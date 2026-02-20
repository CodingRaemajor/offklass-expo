// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  const ACTIVE = "#5B35F2";
  const INACTIVE = "rgba(17,24,39,0.45)";
  const TAB_BG = "rgba(255,255,255,0.96)";
  const BORDER = "rgba(0,0,0,0.08)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
          fontWeight: "800",
        },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          backgroundColor: TAB_BG,
          borderTopWidth: 1,
          borderTopColor: BORDER,

          // iOS shadow
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -8 },

          // Android elevation
          elevation: 10,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home" color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="lessons"
        options={{
          title: "Lessons",
          tabBarIcon: ({ color }) => <Ionicons name="book" color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="quizzes"
        options={{
          title: "Quizzes",
          tabBarIcon: ({ color }) => <Ionicons name="extension-puzzle" color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="flashcards"
        options={{
          title: "Cards",
          tabBarIcon: ({ color }) => <Ionicons name="layers" color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person" color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: "AI",
          tabBarIcon: ({ color }) => <Ionicons name="sparkles" color={color} size={26} />,
        }}
      />
    </Tabs>
  );
}