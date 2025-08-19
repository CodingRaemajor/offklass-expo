import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Chip from "../../components/Chip";
import LessonCard, { Lesson } from "../../components/LessonCard";
import { Colors } from "../../lib/colors";

const SUBJECTS = ["Math", "English"] as const;
const TOPICS = {
  Math: ["All Topics","Addition & Subtraction","Multiplication","Fractions","Geometry","Measurement"],
  English: ["All Topics","Reading Comprehension","Grammar","Vocabulary","Writing","Phonics"],
} as const;

const LESSONS: Record<(typeof SUBJECTS)[number], Lesson[]> = {
  Math: [
    { id: "m1", title: "Addition & Subtraction - Lesson 1", subtitle: "Addition & Subtraction", minutes: 15, difficulty: "Easy", icon: "play-outline", tint: "#EAF7EE" },
    { id: "m2", title: "Multiplication & Division - Lesson 2", subtitle: "Multiplication & Division", minutes: 20, difficulty: "Medium", icon: "document-text-outline", tint: "#FFF1E6" },
    { id: "m3", title: "Fractions - Lesson 3", subtitle: "Fractions", minutes: 25, difficulty: "Hard", icon: "mic-outline", tint: "#FDECEE" },
    { id: "m4", title: "Geometry - Lesson 4", subtitle: "Geometry", minutes: 30, difficulty: "Easy", icon: "help-outline", tint: "#EAF7EE" },
    { id: "m5", title: "Measurement - Lesson 5", subtitle: "Measurement", minutes: 25, difficulty: "Medium", icon: "document-text-outline", tint: "#FFF1E6" },
  ],
  English: [
    { id: "e1", title: "Reading Comprehension - Lesson 1", subtitle: "Reading Comprehension", minutes: 15, difficulty: "Easy", icon: "play-outline", tint: "#EAF7EE" },
    { id: "e2", title: "Grammar - Lesson 2", subtitle: "Grammar", minutes: 20, difficulty: "Medium", icon: "document-text-outline", tint: "#FFF1E6" },
    { id: "e3", title: "Vocabulary - Lesson 3", subtitle: "Vocabulary", minutes: 25, difficulty: "Hard", icon: "mic-outline", tint: "#FDECEE" },
    { id: "e4", title: "Writing - Lesson 4", subtitle: "Writing", minutes: 30, difficulty: "Easy", icon: "help-outline", tint: "#EAF7EE" },
    { id: "e5", title: "Phonics - Lesson 5", subtitle: "Phonics", minutes: 25, difficulty: "Medium", icon: "document-text-outline", tint: "#FFF1E6" },
  ],
};

export default function Lessons() {
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("Math");
  const [topic, setTopic] = useState<(typeof TOPICS[keyof typeof TOPICS])[number]>(TOPICS["Math"][0]);

  const list = LESSONS[subject].filter(l => topic === "All Topics" || l.subtitle === topic);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.h1}>Lessons</Text>

      <View style={styles.subRow}>
        {SUBJECTS.map(s => (
          <View key={s} style={{ flex: 1 }}>
            <Chip label={s} active={s === subject} onPress={() => { setSubject(s); setTopic(TOPICS[s][0]); }} style={{ justifyContent: "center", alignItems: "center" }} />
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TOPICS[subject].map(t => (
          <Chip key={t} label={t} active={t === topic} onPress={() => setTopic(t)} />
        ))}
      </ScrollView>

      <View style={{ height: 12 }} />

      <View style={{ gap: 10 }}>
        {list.map(lesson => <LessonCard key={lesson.id} lesson={lesson} />)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  subRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
});