// components/NextStepFooter.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface NextStepFooterProps {
  onPlayAgain: () => void;
  nextLessonPath?: string; // e.g. "/tabs/lessons"
  nextQuizPath?: string;   // e.g. "/tabs/quizzes?lessonId=2"
}

export function NextStepFooter({
  onPlayAgain,
  nextLessonPath,
  nextQuizPath,
}: NextStepFooterProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Great work! What’s next?</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={onPlayAgain}
        >
          <Ionicons name="refresh-outline" size={16} color="#FFF" />
          <Text style={styles.primaryText}>Play again</Text>
        </TouchableOpacity>

        {nextLessonPath ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push(nextLessonPath as any)}
          >
            <Ionicons name="school-outline" size={16} color="#E5E7EB" />
            <Text style={styles.secondaryText}>Next lesson</Text>
          </TouchableOpacity>
        ) : null}

        {nextQuizPath ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push(nextQuizPath as any)}
          >
            <Ionicons
              name="help-circle-outline"
              size={16}
              color="#E5E7EB"
            />
            <Text style={styles.secondaryText}>Next quiz</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  title: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  primary: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  primaryText: {
    marginLeft: 6,
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryText: {
    marginLeft: 6,
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "500",
  },
});