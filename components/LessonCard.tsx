import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

type Difficulty = "Easy" | "Medium" | "Hard";
export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  difficulty: Difficulty;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string; // e.g. "#E9F5EE"
};

const pillColor = (d: Difficulty) =>
  d === "Easy" ? Colors.green : d === "Medium" ? Colors.yellow : Colors.red;

export default function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: lesson.tint }]}>
        <Ionicons name={lesson.icon} size={20} color={Colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{lesson.title}</Text>
        <Text style={styles.sub}>{lesson.subtitle}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: `${pillColor(lesson.difficulty)}22` }]}>
            <Text style={{ color: pillColor(lesson.difficulty), fontWeight: "600", fontSize: 12 }}>
              {lesson.difficulty}
            </Text>
          </View>
          <Ionicons name="time-outline" size={14} color={Colors.subtext} />
          <Text style={{ color: Colors.subtext, marginLeft: 4, fontSize: 12 }}>{lesson.minutes}m</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.subtext} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderColor: Colors.border, borderWidth: 1,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "700", color: Colors.text },
  sub: { color: Colors.subtext, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});