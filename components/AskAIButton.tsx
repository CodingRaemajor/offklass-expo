// components/AskAIButton.tsx
import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
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
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.85}>
      <Ionicons name="chatbubble-ellipses-outline" size={18} color="#6D28D9" />
      <Text style={styles.text}>Ask Offklass AI about this</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(109, 40, 217, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(109, 40, 217, 0.18)",
    alignSelf: "flex-start",
  },
  text: {
    marginLeft: 8,
    color: "#111827", // DARK (fixed)
    fontSize: 13,
    fontWeight: "800",
  },
});
