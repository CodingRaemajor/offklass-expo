import React, { useState, useCallback, useRef } from "react"
import { View, Text, StyleSheet, ScrollView, Button, TouchableOpacity } from "react-native"
import Chip from "../../components/Chip"
import { Colors } from "../../lib/colors"

const SUBJECTS = ["Math", "English"] as const
const TOPICS = {
  Math: ["All Topics", "Addition & Subtraction", "Multiplication", "Fractions", "Geometry", "Measurement"],
  English: ["All Topics", "Reading Comprehension", "Grammar", "Vocabulary", "Writing", "Phonics"],
} as const

interface VideoLesson {
  id: string
  title: string
  description: string
  youtubeId: string
  topic: string
}

const VIDEO_LESSONS: Record<(typeof SUBJECTS)[number], VideoLesson[]> = {
  Math: [
    {
      id: "m1",
      title: "Addition & Subtraction - Lesson 1",
      description: "Learn addition and subtraction basics.",
      youtubeId: "mgI_F1_s_18",
      topic: "Addition & Subtraction",
    },
    {
      id: "m2",
      title: "Multiplication & Division - Lesson 2",
      description: "Master multiplication and division.",
      youtubeId: "m_gC5g_f-1g",
      topic: "Multiplication",
    },
    {
      id: "m3",
      title: "Fractions - Lesson 3",
      description: "Understand fractions and their parts.",
      youtubeId: "kd_x_g_y_18",
      topic: "Fractions",
    },
    {
      id: "m4",
      title: "Geometry - Lesson 4",
      description: "Explore shapes and their properties.",
      youtubeId: "v6_g_g_g_1g",
      topic: "Geometry",
    },
    {
      id: "m5",
      title: "Measurement - Lesson 5",
      description: "Learn about measuring length, weight, and volume.",
      youtubeId: "NybHckSEQBI",
      topic: "Measurement",
    },
  ],
  English: [
    {
      id: "e1",
      title: "Reading Comprehension - Lesson 1",
      description: "Improve your reading comprehension skills.",
      youtubeId: "Qyd_g_g_g_1g",
      topic: "Reading Comprehension",
    },
    {
      id: "e2",
      title: "Grammar - Lesson 2",
      description: "Understand grammar rules and usage.",
      youtubeId: "A_g_g_g_g_1g",
      topic: "Grammar",
    },
    {
      id: "e3",
      title: "Vocabulary - Lesson 3",
      description: "Expand your vocabulary with new words.",
      youtubeId: "g_g_g_g_g_1g",
      topic: "Vocabulary",
    },
    {
      id: "e4",
      title: "Writing - Lesson 4",
      description: "Learn writing techniques and styles.",
      youtubeId: "g_g_g_g_g_1h",
      topic: "Writing",
    },
    {
      id: "e5",
      title: "Phonics - Lesson 5",
      description: "Master phonics and pronunciation.",
      youtubeId: "g_g_g_g_g_1i",
      topic: "Phonics",
    },
  ],
}

interface VideoLessonCardProps {
  lesson: VideoLesson
  watched: boolean
  onMarkWatched: (id: string) => void
}

function VideoLessonCard({ lesson, watched, onMarkWatched }: VideoLessonCardProps) {
  const playerRef = useRef(null)

  return (
    <View style={[styles.card, watched && styles.cardWatched]}>
      <View style={styles.videoContainer}>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{lesson.title}</Text>
        <Text style={styles.cardDescription}>{lesson.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardTopic}>{lesson.topic}</Text>
          <TouchableOpacity
            onPress={() => onMarkWatched(lesson.id)}
            disabled={watched}
            style={[styles.button, watched ? styles.buttonDisabled : styles.buttonActive]}
          >
            <Text style={[styles.buttonText, watched && styles.buttonTextDisabled]}>
              {watched ? "Watched ✓" : "Mark as Watched"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function Lessons() {
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("Math")
  const [topic, setTopic] = useState<(typeof TOPICS[keyof typeof TOPICS])[number]>(TOPICS["Math"][0])
  const [watchedVideos, setWatchedVideos] = useState<string[]>([])

  const filteredLessons = VIDEO_LESSONS[subject].filter(
    (lesson) => topic === "All Topics" || lesson.topic === topic
  )

  const handleMarkWatched = useCallback(
    (id: string) => {
      if (!watchedVideos.includes(id)) {
        setWatchedVideos((prev) => [...prev, id])
      }
    },
    [watchedVideos]
  )

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.h1}>Lessons</Text>

      <View style={styles.subRow}>
        {SUBJECTS.map((s) => (
          <View key={s} style={{ flex: 1 }}>
            <Chip
              label={s}
              active={s === subject}
              onPress={() => {
                setSubject(s)
                setTopic(TOPICS[s][0])
              }}
              style={{ justifyContent: "center", alignItems: "center" }}
            />
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TOPICS[subject].map((t) => (
          <Chip key={t} label={t} active={t === topic} onPress={() => setTopic(t)} />
        ))}
      </ScrollView>

      <View style={{ height: 12 }} />

      <View style={{ gap: 10 }}>
        {filteredLessons.map((lesson) => (
          <VideoLessonCard
            key={lesson.id}
            lesson={lesson}
            watched={watchedVideos.includes(lesson.id)}
            onMarkWatched={handleMarkWatched}
          />
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  subRow: { flexDirection: "row", gap: 10, marginBottom: 12 },

  card: {
    backgroundColor: "#000000AA",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#3B82F6", // blue-600
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  cardWatched: {
    borderColor: "#16A34A", // green-600
  },
  videoContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#1F2937", // gray-900
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  cardDescription: {
    color: "#D1D5DB", // gray-300
    fontSize: 14,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTopic: {
    color: "#9CA3AF", // gray-400
    fontSize: 12,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 2,
  },
  buttonActive: {
    backgroundColor: "#2563EB", // blue-600
    borderColor: "#3B82F6", // blue-500
  },
  buttonDisabled: {
    backgroundColor: "#16A34A", // green-600
    borderColor: "#22C55E", // green-500
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  buttonTextDisabled: {
    color: "#D1FAE5", // lighter green
  },
})