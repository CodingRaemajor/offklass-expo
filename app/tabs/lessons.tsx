import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Chip from "../../components/Chip";
import { Ionicons } from "@expo/vector-icons";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { Video, ResizeMode } from "expo-av";

/* ----------------------------- Subjects & Units ----------------------------- */

const SUBJECTS = ["Math"] as const;
type Subject = (typeof SUBJECTS)[number];

const UNITS = {
  Math: [
    "All Units",
    "Unit 1: Place Value",
    "Unit 2: Addition & Subtraction",
    "Unit 3: Multiplication",
    "Unit 4: Division",
    "Unit 5: Fractions",
  ],
} as const;
type Unit = (typeof UNITS)[keyof typeof UNITS][number];

/* -------------------------------- Unit Descriptions ----------------------------- */

interface UnitDescription {
  unit: Unit;
  title: string;
  description: string;
  status: "available" | "coming-soon";
}

const UNIT_DESCRIPTIONS: Record<Subject, UnitDescription[]> = {
  Math: [
    {
      unit: "Unit 1: Place Value",
      title: "Unit 1: Place Value",
      description: "Learn about place value, comparing numbers, and understanding digits in different positions.",
      status: "available",
    },
    {
      unit: "Unit 2: Addition & Subtraction",
      title: "Unit 2: Addition & Subtraction",
      description: "Master addition and subtraction with single and multi-digit numbers.",
      status: "coming-soon",
    },
    {
      unit: "Unit 3: Multiplication",
      title: "Unit 3: Multiplication",
      description: "Understand multiplication concepts, times tables, and solving multiplication problems.",
      status: "coming-soon",
    },
    {
      unit: "Unit 4: Division",
      title: "Unit 4: Division",
      description: "Learn division basics, understanding remainders, and solving division problems.",
      status: "coming-soon",
    },
    {
      unit: "Unit 5: Fractions",
      title: "Unit 5: Fractions",
      description: "Explore fractions, their parts, comparing fractions, and basic fraction operations.",
      status: "coming-soon",
    },
  ],
};

/* ---------------------------------- Lessons --------------------------------- */

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  unit: Unit;
  topic: string;
  source: any;
}

const VIDEO_LESSONS: Record<Subject, VideoLesson[]> = {
  Math: [
    {
      id: "m1",
      title: "Understanding Ones and Tens",
      description: "Learn how to identify ones and tens place in numbers.",
      unit: "Unit 1: Place Value",
      topic: "Place Value Basics",
      source: require("../../assets/videos/Lesson1.mp4"),
    },
    {
      id: "m2",
      title: "Comparing Two-Digit Numbers",
      description: "Discover how to compare numbers using place value.",
      unit: "Unit 1: Place Value",
      topic: "Comparing Numbers",
      source: require("../../assets/videos/Lesson2.mp4"),
    },
    {
      id: "m3",
      title: "Hundreds Place Introduction",
      description: "Explore three-digit numbers and the hundreds place.",
      unit: "Unit 1: Place Value",
      topic: "Three-Digit Numbers",
      source: require("../../assets/videos/Lesson3.mp4"),
    },
    {
      id: "m4",
      title: "Expanded Form",
      description: "Learn to write numbers in expanded form using place value.",
      unit: "Unit 1: Place Value",
      topic: "Expanded Notation",
      source: require("../../assets/videos/Lesson4.mp4"),
    },
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
    units: Record<Unit, string>;
    unitLabel: string;
    allUnits: string;
    comingSoon: string;
    tapToPlay: string;
  }
> = {
  English: {
    title: "Lessons",
    subtitle: "Watch short videos by unit.",
    subjects: { Math: "Math" },
    units: {
      "All Units": "All Units",
      "Unit 1: Place Value": "Unit 1: Place Value",
      "Unit 2: Addition & Subtraction": "Unit 2: Addition & Subtraction",
      "Unit 3: Multiplication": "Unit 3: Multiplication",
      "Unit 4: Division": "Unit 4: Division",
      "Unit 5: Fractions": "Unit 5: Fractions",
    },
    unitLabel: "Unit",
    allUnits: "All Units",
    comingSoon: "Coming Soon",
    tapToPlay: "Tap to play",
  },
  नेपाली: {
    title: "पाठहरू",
    subtitle: "इकाई अनुसार छोटा भिडियोहरू।",
    subjects: { Math: "गणित" },
    units: {
      "All Units": "सबै इकाई",
      "Unit 1: Place Value": "इकाई १: स्थानीय मान",
      "Unit 2: Addition & Subtraction": "इकाई २: जोड र घटाउ",
      "Unit 3: Multiplication": "इकाई ३: गुणन",
      "Unit 4: Division": "इकाई ४: भाग",
      "Unit 5: Fractions": "इकाई ५: भिन्न",
    },
    unitLabel: "इकाई",
    allUnits: "सबै इकाई",
    comingSoon: "छिट्टै आउँदैछ",
    tapToPlay: "खेल्न ट्याप गर्नुहोस्",
  },
  اردو: {
    title: "اسباق",
    subtitle: "یونٹ کے مطابق مختصر ویڈیوز۔",
    subjects: { Math: "ریاضی" },
    units: {
      "All Units": "تمام اکائیاں",
      "Unit 1: Place Value": "یونٹ ١: جگہ کی قدر",
      "Unit 2: Addition & Subtraction": "یونٹ ٢: جمع اور تفریق",
      "Unit 3: Multiplication": "یونٹ ٣: ضرب",
      "Unit 4: Division": "یونٹ ٤: تقسیم",
      "Unit 5: Fractions": "یونٹ ٥: کسور",
    },
    unitLabel: "یونٹ",
    allUnits: "تمام اکائیاں",
    comingSoon: "جلد آرہا ہے",
    tapToPlay: "چلانے کے لیے ٹیپ کریں",
  },
  বাংলা: {
    title: "পাঠসমূহ",
    subtitle: "ইউনিট অনুযায়ী ছোট ভিডিও।",
    subjects: { Math: "গণিত" },
    units: {
      "All Units": "সমস্ত ইউনিট",
      "Unit 1: Place Value": "ইউনিট ১: স্থানীয় মান",
      "Unit 2: Addition & Subtraction": "ইউনিট ২: যোগ ও বিয়োগ",
      "Unit 3: Multiplication": "ইউনিট ৩: গুণ",
      "Unit 4: Division": "ইউনিট ৪: ভাগ",
      "Unit 5: Fractions": "ইউনিট ৫: ভগ্নাংশ",
    },
    unitLabel: "ইউনিট",
    allUnits: "সমস্ত ইউনিট",
    comingSoon: "শীঘ্রই আসছে",
    tapToPlay: "চালাতে ট্যাপ করুন",
  },
  हिन्दी: {
    title: "पाठ",
    subtitle: "इकाई के अनुसार छोटे वीडियो।",
    subjects: { Math: "गणित" },
    units: {
      "All Units": "सभी इकाइयाँ",
      "Unit 1: Place Value": "इकाई १: स्थानीय मान",
      "Unit 2: Addition & Subtraction": "इकाई २: जोड़ और घटाव",
      "Unit 3: Multiplication": "इकाई ३: गुणा",
      "Unit 4: Division": "इकाई ४: भाग",
      "Unit 5: Fractions": "इकाई ५: भिन्न",
    },
    unitLabel: "इकाई",
    allUnits: "सभी इकाइयाँ",
    comingSoon: "जल्द आ रहा है",
    tapToPlay: "चलाने के लिए टैप करें",
  },
};

/* ------------------------------ Unit Description Card ----------------------------- */

interface UnitDescriptionCardProps {
  unitDesc: UnitDescription;
  T: (typeof L10N)[Lang];
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
}

function UnitDescriptionCard({ unitDesc, T, rtl, onPress }: UnitDescriptionCardProps & { onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={styles.unitCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.unitHeader}>
        <Text style={[styles.unitTitle, rtl]}>{unitDesc.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {unitDesc.status === "coming-soon" && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>{T.comingSoon}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={UI.accent} />
        </View>
      </View>
      <Text style={[styles.unitDescription, rtl]}>{unitDesc.description}</Text>
    </TouchableOpacity>
  );
}

/* ------------------------------ Lesson Card UI ----------------------------- */

interface VideoLessonCardProps {
  lesson: VideoLesson;
  T: (typeof L10N)[Lang];
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
}

function VideoLessonCard({ lesson, T, rtl }: VideoLessonCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = React.useRef<Video>(null);

  // Play AFTER mount (Android fix)
  useEffect(() => {
    if (showVideo) {
      setTimeout(() => {
        videoRef.current?.playAsync();
      }, 100);
    }
  }, [showVideo]);

  return (
    <View style={styles.card}>
      <View style={styles.thumbWrap}>
        {showVideo ? (
          <Video
            ref={videoRef}
            source={lesson.source}
            style={styles.thumb}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
          />
        ) : (
          <TouchableOpacity
            style={styles.thumbPlaceholder}
            activeOpacity={0.85}
            onPress={() => setShowVideo(true)}
          >
            <Ionicons name="play" size={28} color="#FFF" />
            <Text style={styles.thumbPlaceholderText}>
              {T.tapToPlay}
            </Text>

            <View style={styles.playFab}>
              <Ionicons name="play" size={18} color="#FFF" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, rtl]} numberOfLines={2}>
          {lesson.title}
        </Text>
        <Text style={[styles.cardDescription, rtl]} numberOfLines={3}>
          {lesson.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.cardTopic, rtl]}>Topic:</Text>
          <View style={styles.topicPill}>
            <Text style={styles.topicPillText} numberOfLines={1}>
              {lesson.topic}
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
  const [unit, setUnit] = useState<Unit>(UNITS["Math"][0]);
  const [lang, setLang] = useState<Lang>("English");

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const l = (saved?.language as Lang) || "English";
      const safeLang = (LANGS as readonly string[]).includes(l) ? l : "English";
      setLang(safeLang as Lang);
    })();
  }, []);

  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({
        writingDirection: "rtl" as const,
        textAlign: "right" as const,
      })
    : undefined;

  const showAllUnits = unit === "All Units";
  const filteredLessons = showAllUnits
    ? []
    : VIDEO_LESSONS[subject].filter((lesson) => lesson.unit === unit);

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
                  setUnit(UNITS[s][0]);
                }}
                style={{ justifyContent: "center", alignItems: "center" }}
              />
            </View>
          ))}
        </View>

        {/* Unit chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {UNITS[subject].map((u) => (
            <Chip
              key={u}
              label={T.units[u] ?? u}
              active={u === unit}
              onPress={() => setUnit(u)}
            />
          ))}
        </ScrollView>

        <View style={{ height: 10 }} />

        {/* Content: either unit descriptions or lessons */}
        <View style={{ gap: 12 }}>
          {showAllUnits ? (
            // Show all unit descriptions when "All Units" is selected
            UNIT_DESCRIPTIONS[subject].map((unitDesc) => (
              <UnitDescriptionCard
                key={unitDesc.unit}
                unitDesc={unitDesc}
                T={T}
                rtl={rtl}
                onPress={() => setUnit(unitDesc.unit)}
              />
            ))
          ) : (
            // Show lessons for the selected unit
            filteredLessons.map((lesson) => (
              <VideoLessonCard
                key={lesson.id}
                lesson={lesson}
                T={T}
                rtl={rtl}
              />
            ))
          )}
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
  comingSoon: "#F59E0B",
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

  // Unit description card
  unitCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: UI.cardBorder,
    padding: 16,
  },
  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  unitTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: UI.text,
    flex: 1,
  },
  comingSoonBadge: {
    backgroundColor: UI.comingSoon + "20",
    borderColor: UI.comingSoon,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonText: {
    color: UI.comingSoon,
    fontSize: 11,
    fontWeight: "700",
  },
  unitDescription: {
    color: UI.subtext,
    fontSize: 13,
    lineHeight: 18,
  },

  // Video lesson card
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

  thumbPlaceholder: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlaceholderText: {
    marginTop: 6,
    color: "#E6EAF2",
    fontSize: 12,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: UI.text,
    marginBottom: 6,
  },
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