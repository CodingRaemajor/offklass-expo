import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Chip from "../../components/Chip";
import { Colors } from "../../lib/colors";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { Ionicons } from "@expo/vector-icons";

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
  topic: Topic;
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
    subtitle: string;
    subjects: Record<Subject, string>;
    topics: Record<Topic, string>;
    topicLabel: string;
    allTopics: string;
  }
> = {
  English: {
    title: "Lessons",
    subtitle: "Watch short videos by topic.",
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
    allTopics: "All Topics",
  },
  नेपाली: {
    title: "पाठहरू",
    subtitle: "विषय अनुसार छोटा भिडियोहरू।",
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
    allTopics: "सबै विषय",
  },
  اردو: {
    title: "اسباق",
    subtitle: "موضوع کے حساب سے مختصر ویڈیوز۔",
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
    allTopics: "تمام موضوعات",
  },
  বাংলা: {
    title: "পাঠসমূহ",
    subtitle: "বিষয় অনুযায়ী ছোট ভিডিও।",
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
    allTopics: "সমস্ত বিষয়",
  },
  हिन्दी: {
    title: "पाठ",
    subtitle: "विषय के अनुसार छोटे वीडियो।",
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
    allTopics: "सभी विषय",
  },
};

/* ------------------------------ Lesson Card UI ----------------------------- */

interface VideoLessonCardProps {
  lesson: VideoLesson;
  T: (typeof L10N)[Lang];
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
}

function VideoLessonCard({ lesson, T, rtl }: VideoLessonCardProps) {
  const thumb = `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${lesson.youtubeId}`)}
        style={styles.thumbWrap}
      >
        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
        {/* gradient overlay via pure view tint */}
        <View style={styles.thumbShade} />
        <View style={styles.playFab}>
          <Ionicons name="play" size={18} color="#FFF" />
        </View>
      </TouchableOpacity>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, rtl]} numberOfLines={2}>
          {lesson.title}
        </Text>
        <Text style={[styles.cardDescription, rtl]} numberOfLines={3}>
          {lesson.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.cardTopic, rtl]}>
            {T.topicLabel}:
          </Text>
          <View style={styles.topicPill}>
            <Text style={styles.topicPillText} numberOfLines={1}>
              {T.topics[lesson.topic] ?? lesson.topic}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ----------------------------------- Screen ---------------------------------- */

export default function Lessons() {
  const [subject, setSubject] = useState<Subject>("Math");
  const [topic, setTopic] = useState<Topic>(TOPICS["Math"][0]);
  const [lang, setLang] = useState<Lang>("English");

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

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        overScrollMode="never"
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={[styles.title, rtl]}>{T.title}</Text>
          <Text style={[styles.subtitle, rtl]}>{T.subtitle}</Text>
        </View>

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {TOPICS[subject].map((t) => (
            <Chip
              key={t}
              label={T.topics[t] ?? t}
              active={t === topic}
              onPress={() => setTopic(t)}
            />
          ))}
        </ScrollView>

        <View style={{ height: 10 }} />

        {/* Lessons list */}
        <View style={{ gap: 12 }}>
          {filteredLessons.map((lesson) => (
            <VideoLessonCard key={lesson.id} lesson={lesson} T={T} rtl={rtl} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------------- Styles ---------------------------------- */

const UI = {
  bg: "#0B0E14",
  card: "#0F1421",
  cardBorder: "#1C2740",
  text: "#E6EAF2",
  subtext: "#9AA5B1",
  pill: "#111827",
  pillBorder: "#22304A",
  accent: "#7C3AED",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  scroll: { flex: 1, backgroundColor: UI.bg },

  headerCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  title: { color: UI.text, fontSize: 18, fontWeight: "800" },
  subtitle: { color: UI.subtext, marginTop: 2 },

  subRow: { flexDirection: "row", gap: 10, marginVertical: 12 },

  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: UI.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  thumbWrap: { width: "100%", aspectRatio: 16 / 9, position: "relative" },
  thumb: { width: "100%", height: "100%" },
  thumbShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  playFab: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#4C2AC8",
  },

  cardContent: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: UI.text, marginBottom: 6 },
  cardDescription: { color: UI.subtext, fontSize: 13, marginBottom: 10 },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTopic: { color: UI.subtext, fontSize: 12 },

  topicPill: {
    backgroundColor: UI.pill,
    borderColor: UI.pillBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  topicPillText: { color: UI.text, fontSize: 12, fontWeight: "700" },
});