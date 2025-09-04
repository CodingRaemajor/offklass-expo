import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Chip from "../../components/Chip";
import { Colors } from "../../lib/colors";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";

/* ----------------------------- Subjects & Topics ----------------------------- */

const SUBJECTS = ["Math", "English"] as const;
type Subject = (typeof SUBJECTS)[number];

const TOPICS = {
  Math: ["All Topics", "Addition & Subtraction", "Multiplication", "Fractions", "Geometry", "Measurement"],
  English: ["All Topics", "Reading Comprehension", "Grammar", "Vocabulary", "Writing", "Phonics"],
} as const;
type Topic = (typeof TOPICS)[keyof typeof TOPICS][number];

/* ---------------------------------- Lessons --------------------------------- */

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  topic: Topic; // keep internal topic keys in English
}

const VIDEO_LESSONS: Record<Subject, VideoLesson[]> = {
  Math: [
    { id: "m1", title: "Addition & Subtraction - Lesson 1", description: "Learn addition and subtraction basics.", youtubeId: "mgI_F1_s_18", topic: "Addition & Subtraction" },
    { id: "m2", title: "Multiplication & Division - Lesson 2", description: "Master multiplication and division.", youtubeId: "m_gC5g_f-1g", topic: "Multiplication" },
    { id: "m3", title: "Fractions - Lesson 3", description: "Understand fractions and their parts.", youtubeId: "kd_x_g_y_18", topic: "Fractions" },
    { id: "m4", title: "Geometry - Lesson 4", description: "Explore shapes and their properties.", youtubeId: "v6_g_g_g_1g", topic: "Geometry" },
    { id: "m5", title: "Measurement - Lesson 5", description: "Learn about measuring length, weight, and volume.", youtubeId: "NybHckSEQBI", topic: "Measurement" },
  ],
  English: [
    { id: "e1", title: "Reading Comprehension - Lesson 1", description: "Improve your reading comprehension skills.", youtubeId: "Qyd_g_g_g_1g", topic: "Reading Comprehension" },
    { id: "e2", title: "Grammar - Lesson 2", description: "Understand grammar rules and usage.", youtubeId: "A_g_g_g_g_1g", topic: "Grammar" },
    { id: "e3", title: "Vocabulary - Lesson 3", description: "Expand your vocabulary with new words.", youtubeId: "g_g_g_g_g_1g", topic: "Vocabulary" },
    { id: "e4", title: "Writing - Lesson 4", description: "Learn writing techniques and styles.", youtubeId: "g_g_g_g_g_1h", topic: "Writing" },
    { id: "e5", title: "Phonics - Lesson 5", description: "Master phonics and pronunciation.", youtubeId: "g_g_g_g_g_1i", topic: "Phonics" },
  ],
};

/* --------------------------------- i18n bits -------------------------------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    title: string;
    subjects: Record<Subject, string>;
    topics: Record<Topic, string>;
    topicLabel: string;
    markWatched: string;
    watched: string;
    allTopics: string;
  }
> = {
  English: {
    title: "Lessons",
    subjects: { Math: "Math", English: "English" },
    topics: {
      "All Topics": "All Topics",
      "Addition & Subtraction": "Addition & Subtraction",
      Multiplication: "Multiplication",
      Fractions: "Fractions",
      Geometry: "Geometry",
      Measurement: "Measurement",
      "Reading Comprehension": "Reading Comprehension",
      Grammar: "Grammar",
      Vocabulary: "Vocabulary",
      Writing: "Writing",
      Phonics: "Phonics",
    },
    topicLabel: "Topic",
    markWatched: "Mark as Watched",
    watched: "Watched ✓",
    allTopics: "All Topics",
  },
  नेपाली: {
    title: "पाठहरू",
    subjects: { Math: "गणित", English: "अंग्रेजी" },
    topics: {
      "All Topics": "सबै विषय",
      "Addition & Subtraction": "जोड र घटाउ",
      Multiplication: "गुणन",
      Fractions: "भिन्न",
      Geometry: "ज्यामिति",
      Measurement: "मापन",
      "Reading Comprehension": "पढाइ-अवग्रह",
      Grammar: "व्याकरण",
      Vocabulary: "शब्दावली",
      Writing: "लेखन",
      Phonics: "फोनिक्स",
    },
    topicLabel: "विषय",
    markWatched: "हेरेको चिन्ह लगाउनुहोस्",
    watched: "हेरियो ✓",
    allTopics: "सबै विषय",
  },
  اردو: {
    title: "اسباق",
    subjects: { Math: "ریاضی", English: "انگریزی" },
    topics: {
      "All Topics": "تمام موضوعات",
      "Addition & Subtraction": "جمع و تفریق",
      Multiplication: "ضرب",
      Fractions: "کسر",
      Geometry: "ہندسہ",
      Measurement: "پیمائش",
      "Reading Comprehension": "مطالعہ فہم",
      Grammar: "گرامر",
      Vocabulary: "الفاظ",
      Writing: "تحریر",
      Phonics: "صوتیات",
    },
    topicLabel: "موضوع",
    markWatched: "دیکھی گئی نشان لگائیں",
    watched: "دیکھ لیا ✓",
    allTopics: "تمام موضوعات",
  },
  বাংলা: {
    title: "পাঠসমূহ",
    subjects: { Math: "গণিত", English: "ইংরেজি" },
    topics: {
      "All Topics": "সমস্ত বিষয়",
      "Addition & Subtraction": "যোগ ও বিয়োগ",
      Multiplication: "গুণ",
      Fractions: "ভগ্নাংশ",
      Geometry: "জ্যামিতি",
      Measurement: "পরিমাপ",
      "Reading Comprehension": "পাঠ বোঝাপড়া",
      Grammar: "ব্যাকরণ",
      Vocabulary: "শব্দভাণ্ডার",
      Writing: "রচনা",
      Phonics: "ধ্বনিতত্ত্ব",
    },
    topicLabel: "বিষয়",
    markWatched: "দেখা হয়েছে চিহ্ন দিন",
    watched: "দেখা হয়েছে ✓",
    allTopics: "সমস্ত বিষয়",
  },
  हिन्दी: {
    title: "पाठ",
    subjects: { Math: "गणित", English: "अंग्रेज़ी" },
    topics: {
      "All Topics": "सभी विषय",
      "Addition & Subtraction": "योग और घटाव",
      Multiplication: "गुणा",
      Fractions: "भिन्न",
      Geometry: "ज्यामिति",
      Measurement: "मापन",
      "Reading Comprehension": "पठन-समझ",
      Grammar: "व्याकरण",
      Vocabulary: "शब्दावली",
      Writing: "लेखन",
      Phonics: "ध्वन्यात्मक",
    },
    topicLabel: "विषय",
    markWatched: "देखा हुआ मार्क करें",
    watched: "देख लिया ✓",
    allTopics: "सभी विषय",
  },
};

/* ------------------------------ Lesson Card UI ----------------------------- */

interface VideoLessonCardProps {
  lesson: VideoLesson;
  watched: boolean;
  onMarkWatched: (id: string) => void;
  T: (typeof L10N)[Lang];
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
}

function VideoLessonCard({ lesson, watched, onMarkWatched, T, rtl }: VideoLessonCardProps) {
  const playerRef = useRef(null);

  return (
    <View style={[styles.card, watched && styles.cardWatched]}>
      <View style={styles.videoContainer} />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, rtl]}>{lesson.title}</Text>
        <Text style={[styles.cardDescription, rtl]}>{lesson.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardTopic, rtl]}>{T.topicLabel}: {T.topics[lesson.topic] ?? lesson.topic}</Text>
          <TouchableOpacity
            onPress={() => onMarkWatched(lesson.id)}
            disabled={watched}
            style={[styles.button, watched ? styles.buttonDisabled : styles.buttonActive]}
          >
            <Text style={[styles.buttonText, watched && styles.buttonTextDisabled, rtl]}>
              {watched ? T.watched : T.markWatched}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ----------------------------------- Screen ---------------------------------- */

export default function Lessons() {
  const [subject, setSubject] = useState<Subject>("Math");
  const [topic, setTopic] = useState<Topic>(TOPICS["Math"][0]);
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
  const [lang, setLang] = useState<Lang>("English");

  // Load language from onboarding
  useEffect(() => {
    (async () => {
      const saved = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const l = (saved?.language as Lang) || "English";
      setLang(LANGS.includes(l) ? l : "English");
    })();
  }, []);

  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL ? ({ writingDirection: "rtl" as const, textAlign: "right" as const }) : undefined;

  const filteredLessons = VIDEO_LESSONS[subject].filter(
    (lesson) => topic === "All Topics" || lesson.topic === topic
  );

  const handleMarkWatched = useCallback(
    (id: string) => {
      if (!watchedVideos.includes(id)) setWatchedVideos((prev) => [...prev, id]);
    },
    [watchedVideos]
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[styles.h1, rtl]}>{T.title}</Text>

      {/* Subject chips */}
      <View style={styles.subRow}>
        {SUBJECTS.map((s) => (
          <View key={s} style={{ flex: 1 }}>
            <Chip
              label={T.subjects[s]}
              active={s === subject}
              onPress={() => {
                setSubject(s);
                setTopic(TOPICS[s][0]);
              }}
              style={{ justifyContent: "center", alignItems: "center" }}
            />
          </View>
        ))}
      </View>

      {/* Topic chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TOPICS[subject].map((t) => (
          <Chip
            key={t}
            label={T.topics[t] ?? t}
            active={t === topic}
            onPress={() => setTopic(t)}
          />
        ))}
      </ScrollView>

      <View style={{ height: 12 }} />

      {/* Lessons list */}
      <View style={{ gap: 10 }}>
        {filteredLessons.map((lesson) => (
          <VideoLessonCard
            key={lesson.id}
            lesson={lesson}
            watched={watchedVideos.includes(lesson.id)}
            onMarkWatched={handleMarkWatched}
            T={T}
            rtl={rtl}
          />
        ))}
      </View>
    </ScrollView>
  );
}

/* ----------------------------------- Styles ---------------------------------- */

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
  cardWatched: { borderColor: "#16A34A" }, // green-600
  videoContainer: { width: "100%", height: 200, backgroundColor: "#1F2937" }, // gray-900
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "white", marginBottom: 8 },
  cardDescription: { color: "#D1D5DB", fontSize: 14, marginBottom: 12 }, // gray-300
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTopic: { color: "#9CA3AF", fontSize: 12 }, // gray-400
  button: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 2 },
  buttonActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" }, // blue
  buttonDisabled: { backgroundColor: "#16A34A", borderColor: "#22C55E" }, // green
  buttonText: { color: "white", fontWeight: "600" },
  buttonTextDisabled: { color: "#D1FAE5" }, // lighter green
});