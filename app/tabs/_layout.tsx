import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { setVideoCacheSizeAsync } from "expo-video";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.purple,
        tabBarStyle: { height: 64, paddingBottom: 10, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({color,size}) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="lessons" options={{ title: "Lessons", tabBarIcon: ({color,size}) => <Ionicons name="school-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="quizzes" options={{ title: "Quizzes", tabBarIcon: ({color,size}) => <Ionicons name="help-circle-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="flashcards" options={{ title: "Flashcards", tabBarIcon: ({color,size}) => <Ionicons name="albums-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({color,size}) => <Ionicons name="person-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="ai" options={{ title: "Offklass AI", tabBarIcon: ({color,size}) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}