// components/AskAIButton.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface AskAIButtonProps {
  question: string;
  userAnswer?: string;
  correctAnswer?: string;
  contextType?: "quiz" | "flashcard";
}

export function AskAIButton({
  question,
  userAnswer,
  correctAnswer,
  contextType = "quiz",
}: AskAIButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: "/tabs/ai",
      params: {
        from: contextType,
        question,
        userAnswer: userAnswer ?? "",
        correctAnswer: correctAnswer ?? "",
      },
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={18}
        color="#A855F7"
      />
      <Text style={styles.text}>Ask Offklass AI about this</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    alignSelf: "flex-start",
  },
  text: {
    marginLeft: 6,
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "500",
  },
});