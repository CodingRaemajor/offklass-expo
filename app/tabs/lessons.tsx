// app/(tabs)/lessons.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import { router, useLocalSearchParams } from "expo-router";

import Chip from "../../components/Chip";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { Colors } from "../../lib/colors";

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
      description:
        "Learn about place value, comparing numbers, and understanding digits in different positions.",
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
      description:
        "Understand multiplication concepts, times tables, and solving multiplication problems.",
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
      description:
        "Explore fractions, their parts, comparing fractions, and basic fraction operations.",
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
      source: require("../../assets/videos/lesson1.mp4"),
    },
    {
      id: "m2",
      title: "Comparing Two-Digit Numbers",
      description: "Discover how to compare numbers using place value.",
      unit: "Unit 1: Place Value",
      topic: "Comparing Numbers",
      source: require("../../assets/videos/lesson2.mp4"),
    },
    {
      id: "m3",
      title: "Hundreds Place Introduction",
      description: "Explore three-digit numbers and the hundreds place.",
      unit: "Unit 1: Place Value",
      topic: "Three-Digit Numbers",
      source: require("../../assets/videos/lesson3.mp4"),
    },
    {
      id: "m4",
      title: "Expanded Form",
      description: "Learn to write numbers in expanded form using place value.",
      unit: "Unit 1: Place Value",
      topic: "Expanded Notation",
      source: require("../../assets/videos/lesson4.mp4"),
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
    comingSoon: string;
    tapToPlay: string;
    back: string;

    unitsHeading: string;
    videosHeading: string;

    full: string;
  }
> = {
  English: {
    title: "Lessons",
    subtitle: "Pick a unit and watch fun videos ✨",
    subjects: { Math: "Math" },
    units: {
      "All Units": "All Units",
      "Unit 1: Place Value": "Unit 1: Place Value",
      "Unit 2: Addition & Subtraction": "Unit 2: Addition & Subtraction",
      "Unit 3: Multiplication": "Unit 3: Multiplication",
      "Unit 4: Division": "Unit 4: Division",
      "Unit 5: Fractions": "Unit 5: Fractions",
    },
    comingSoon: "Coming Soon",
    tapToPlay: "Tap to play",
    back: "Back",
    unitsHeading: "Units",
    videosHeading: "Videos",
    full: "Full",
  },
  नेपाली: {
    title: "पाठहरू",
    subtitle: "इकाई छान्नुहोस् र रमाइला भिडियो हेर्नुहोस् ✨",
    subjects: { Math: "गणित" },
    units: {
      "All Units": "सबै इकाई",
      "Unit 1: Place Value": "इकाई १: स्थानीय मान",
      "Unit 2: Addition & Subtraction": "इकाई २: जोड र घटाउ",
      "Unit 3: Multiplication": "इकाई ३: गुणन",
      "Unit 4: Division": "इकाई ४: भाग",
      "Unit 5: Fractions": "इकाई ५: भिन्न",
    },
    comingSoon: "छिट्टै आउँदैछ",
    tapToPlay: "खेल्न ट्याप गर्नुहोस्",
    back: "फर्कनुहोस्",
    unitsHeading: "इकाईहरू",
    videosHeading: "भिडियोहरू",
    full: "फुल",
  },
  اردو: {
    title: "اسباق",
    subtitle: "یونٹ منتخب کریں اور مزے کی ویڈیوز دیکھیں ✨",
    subjects: { Math: "ریاضی" },
    units: {
      "All Units": "تمام اکائیاں",
      "Unit 1: Place Value": "یونٹ ١: جگہ کی قدر",
      "Unit 2: Addition & Subtraction": "یونٹ ٢: جمع اور تفریق",
      "Unit 3: Multiplication": "یونٹ ٣: ضرب",
      "Unit 4: Division": "یونٹ ٤: تقسیم",
      "Unit 5: Fractions": "یونٹ ٥: کسور",
    },
    comingSoon: "جلد آرہا ہے",
    tapToPlay: "چلانے کے لیے ٹیپ کریں",
    back: "واپس",
    unitsHeading: "یونٹس",
    videosHeading: "ویڈیوز",
    full: "فل",
  },
  বাংলা: {
    title: "পাঠসমূহ",
    subtitle: "ইউনিট বাছুন আর মজার ভিডিও দেখুন ✨",
    subjects: { Math: "গণিত" },
    units: {
      "All Units": "সমস্ত ইউনিট",
      "Unit 1: Place Value": "ইউনিট ১: স্থানীয় মান",
      "Unit 2: Addition & Subtraction": "ইউনিট ২: যোগ ও বিয়োগ",
      "Unit 3: Multiplication": "ইউনিট ৩: গুণ",
      "Unit 4: Division": "ইউনিট ৪: ভাগ",
      "Unit 5: Fractions": "ইউনিট ৫: ভগ্নাংশ",
    },
    comingSoon: "শীঘ্রই আসছে",
    tapToPlay: "চালাতে ট্যাপ করুন",
    back: "ফিরে যান",
    unitsHeading: "ইউনিট",
    videosHeading: "ভিডিও",
    full: "ফুল",
  },
  हिन्दी: {
    title: "पाठ",
    subtitle: "इकाई चुनें और मज़ेदार वीडियो देखें ✨",
    subjects: { Math: "गणित" },
    units: {
      "All Units": "सभी इकाइयाँ",
      "Unit 1: Place Value": "इकाई १: स्थानीय मान",
      "Unit 2: Addition & Subtraction": "इकाई २: जोड़ और घटाव",
      "Unit 3: Multiplication": "इकाई ३: गुणा",
      "Unit 4: Division": "इकाई ४: भाग",
      "Unit 5: Fractions": "इकाई ५: भिन्न",
    },
    comingSoon: "जल्द आ रहा है",
    tapToPlay: "चलाने के लिए टैप करें",
    back: "वापस",
    unitsHeading: "इकाइयाँ",
    videosHeading: "वीडियो",
    full: "फुल",
  },
};

/* ----------------------------- Background ------------------------------ */

function FunBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={[styles.blob, styles.blobC]} />
      <View style={[styles.blob, styles.blobD]} />
      <View style={[styles.star, { top: 58, right: 26 }]} />
      <View style={[styles.star, { top: 140, left: 18, transform: [{ rotate: "18deg" }] }]} />
      <View style={[styles.star, { bottom: 120, right: 22, transform: [{ rotate: "-12deg" }] }]} />
    </View>
  );
}

/* ----------------------------- Subcomponents ------------------------------ */

function SoftHeaderCard({
  title,
  subtitle,
  rtl,
}: {
  title: string;
  subtitle: string;
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
}) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerBadgeIcon}>
          <Ionicons name="sparkles" size={18} color={UI.pink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, rtl]}>{title}</Text>
          <Text style={[styles.headerSub, rtl]}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

function UnitTile({
  unitDesc,
  T,
  rtl,
  onPress,
}: {
  unitDesc: UnitDescription;
  T: (typeof L10N)[Lang];
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
  onPress: () => void;
}) {
  const isComingSoon = unitDesc.status === "coming-soon";

  const iconName =
    unitDesc.unit === "Unit 1: Place Value"
      ? ("calculator-outline" as const)
      : unitDesc.unit === "Unit 2: Addition & Subtraction"
        ? ("add-circle-outline" as const)
        : unitDesc.unit === "Unit 3: Multiplication"
          ? ("grid-outline" as const)
          : unitDesc.unit === "Unit 4: Division"
            ? ("shuffle-outline" as const)
            : ("pie-chart-outline" as const);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.97 },
      ]}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={iconName} size={22} color={UI.blue} />
      </View>

      <Text style={[styles.tileTitle, rtl]} numberOfLines={2}>
        {unitDesc.title}
      </Text>

      <Text style={[styles.tileSub, rtl]} numberOfLines={3}>
        {unitDesc.description}
      </Text>

      <View style={styles.tileFooter}>
        {isComingSoon ? (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>{T.comingSoon}</Text>
          </View>
        ) : (
          <View style={styles.readyBadge}>
            <Ionicons name="checkmark-circle" size={14} color={UI.green} />
            <Text style={styles.readyText}>Ready</Text>
          </View>
        )}

        <Ionicons name="chevron-forward" size={18} color={UI.muted} />
      </View>
    </Pressable>
  );
}

function LessonTile({
  lesson,
  rtl,
  onPress,
}: {
  lesson: VideoLesson;
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.97 },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: UI.yellowSoft }]}>
        <Ionicons name="play-circle-outline" size={24} color={UI.orange} />
      </View>

      <Text style={[styles.tileTitle, rtl]} numberOfLines={2}>
        {lesson.title}
      </Text>

      <Text style={[styles.tileSub, rtl]} numberOfLines={3}>
        {lesson.description}
      </Text>

      <View style={styles.tileFooter}>
        <View style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={1}>
            {lesson.topic}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={UI.muted} />
      </View>
    </Pressable>
  );
}

/* ------------------------------ Player View (ONLY FULLSCREEN) ----------------------------- */

function LessonPlayer({
  lesson,
  T,
  rtl,
  isTablet,
  paddingX,
}: {
  lesson: VideoLesson;
  T: (typeof L10N)[Lang];
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
  isTablet: boolean;
  paddingX: number;
}) {
  const videoRef = useRef<Video>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  const onStatus = (st: AVPlaybackStatus) => {
    if (!st.isLoaded) return;
    setIsLoaded(true);
  };

  const openFullscreen = async () => {
    try {
      // IMPORTANT:
      // 1) we use Expo fullscreen player so you get the native seek bar there
      // 2) on some Android devices, seek works reliably only in fullscreen native controls
      await videoRef.current?.presentFullscreenPlayer();
    } catch {}
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: paddingX,
          paddingTop: 16,
          paddingBottom: 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      <Pressable
        onPress={() => router.replace({ pathname: "/tabs/lessons", params: {} })}
        style={({ pressed }) => [
          styles.backPill,
          pressed && { transform: [{ scale: 0.99 }], opacity: 0.96 },
        ]}
      >
        <Ionicons name="chevron-back" size={18} color={UI.text} />
        <Text style={[styles.backPillText, rtl]}>{T.back}</Text>
      </Pressable>

      <View style={styles.playerHeaderCard}>
        <View style={styles.playerBadgesRow}>
          <View style={styles.playerBadge}>
            <Text style={styles.playerBadgeText} numberOfLines={1}>
              {lesson.unit}
            </Text>
          </View>
          <View style={[styles.playerBadge, { backgroundColor: UI.pinkSoft, borderColor: "rgba(236,72,153,0.20)" }]}>
            <Text style={styles.playerBadgeText} numberOfLines={1}>
              {lesson.topic}
            </Text>
          </View>
        </View>

        <Text style={[styles.playerTitle, rtl]} numberOfLines={2}>
          {lesson.title}
        </Text>
        <Text style={[styles.playerSub, rtl]} numberOfLines={3}>
          {lesson.description}
        </Text>
      </View>

      {/* Video card (simple). Tap FULL to get native controls + seeking. */}
      <View style={[styles.videoCard, isTablet && { borderRadius: 22 }]}>
        <View style={styles.videoWrap}>
          <Video
            ref={videoRef}
            source={lesson.source}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls // keep simple; fullscreen will also show native seek
            onPlaybackStatusUpdate={onStatus}
          />

          {/* Fullscreen button (only control) */}
          <Pressable
            onPress={openFullscreen}
            style={({ pressed }) => [
              styles.fullBtn,
              pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
            ]}
          >
            <Ionicons name="expand-outline" size={18} color="#fff" />
            <Text style={styles.fullBtnText}>{T.full}</Text>
          </Pressable>

          {/* Gentle hint overlay while not loaded yet */}
          {!isLoaded && (
            <View style={styles.hintOverlay} pointerEvents="none">
              <View style={styles.hintPill}>
                <Ionicons name="hand-left-outline" size={16} color={UI.text} />
                <Text style={styles.hintText}>Tap “Full” for best controls</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

/* ----------------------------------- Screen ---------------------------------- */

const BG = "#F6F8FF";

export default function Lessons() {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
  const isTablet = width >= 900;

  const params = useLocalSearchParams<{ lessonId?: string }>();

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

  const paddingX = isTablet ? 28 : 16;

  const selectedLesson = useMemo(() => {
    const all = VIDEO_LESSONS[subject];
    if (!params.lessonId) return null;
    return all.find((x) => x.id === params.lessonId) ?? null;
  }, [params.lessonId, subject]);

  if (selectedLesson) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <FunBackground />
        <LessonPlayer lesson={selectedLesson} T={T} rtl={rtl} isTablet={isTablet} paddingX={paddingX} />
      </SafeAreaView>
    );
  }

  const showAllUnits = unit === "All Units";
  const filteredLessons = showAllUnits ? [] : VIDEO_LESSONS[subject].filter((l) => l.unit === unit);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FunBackground />
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(16, insets.bottom + 16),
              paddingHorizontal: paddingX,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <SoftHeaderCard title={T.title} subtitle={T.subtitle} rtl={rtl} />

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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {UNITS[subject].map((u) => (
              <Chip key={u} label={T.units[u] ?? u} active={u === unit} onPress={() => setUnit(u)} />
            ))}
          </ScrollView>

          <View style={{ height: 14 }} />

          <View style={styles.grid}>
            {showAllUnits
              ? UNIT_DESCRIPTIONS[subject].map((unitDesc) => (
                  <UnitTile
                    key={unitDesc.unit}
                    unitDesc={unitDesc}
                    T={T}
                    rtl={rtl}
                    onPress={() => setUnit(unitDesc.unit)}
                  />
                ))
              : filteredLessons.map((lesson) => (
                  <LessonTile
                    key={lesson.id}
                    lesson={lesson}
                    rtl={rtl}
                    onPress={() => {
                      router.push({
                        pathname: "/tabs/lessons",
                        params: { lessonId: lesson.id },
                      });
                    }}
                  />
                ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ----------------------------------- Colors ---------------------------------- */

const UI = {
  bg: BG,
  text: "#0F172A",
  muted: "rgba(15,23,42,0.62)",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(2,6,23,0.06)",
  shadow: "#000",

  blue: "#2F6BFF",
  blueSoft: "rgba(47,107,255,0.12)",

  pink: "#EC4899",
  pinkSoft: "rgba(236,72,153,0.12)",

  yellowSoft: "rgba(250,204,21,0.18)",
  orange: "#F97316",

  green: "#16A34A",

  accent: Colors?.purple ?? "#7C3AED",

  comingSoon: "#F59E0B",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },

  scroll: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { paddingTop: 16 },

  blob: { position: "absolute", borderRadius: 999, opacity: 0.45 },
  blobA: { width: 240, height: 240, backgroundColor: "rgba(47,107,255,0.20)", top: -80, left: -70 },
  blobB: { width: 220, height: 220, backgroundColor: "rgba(236,72,153,0.18)", top: 40, right: -80 },
  blobC: { width: 260, height: 260, backgroundColor: "rgba(250,204,21,0.18)", bottom: -110, left: -80 },
  blobD: { width: 220, height: 220, backgroundColor: "rgba(16,185,129,0.14)", bottom: 40, right: -90 },

  star: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  headerCard: {
    width: "100%",
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.18)",
  },
  headerTitle: { color: UI.text, fontWeight: "900", fontSize: 18 },
  headerSub: { color: UI.muted, fontWeight: "800", marginTop: 3, fontSize: 12.5 },

  subRow: { flexDirection: "row", gap: 10, marginVertical: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },

  tile: {
    width: "48%",
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  tileIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: UI.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(47,107,255,0.16)",
  },

  tileTitle: { color: UI.text, fontWeight: "900", fontSize: 14 },
  tileSub: { color: UI.muted, fontWeight: "800", marginTop: 4, fontSize: 12, lineHeight: 16 },

  tileFooter: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },

  comingSoonBadge: {
    backgroundColor: "rgba(245,158,11,0.16)",
    borderColor: "rgba(245,158,11,0.35)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  comingSoonText: { color: "#B45309", fontSize: 11, fontWeight: "900" },

  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22,163,74,0.10)",
    borderColor: "rgba(22,163,74,0.22)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readyText: { color: "#14532D", fontSize: 11, fontWeight: "900" },

  pill: {
    backgroundColor: "rgba(47,107,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(47,107,255,0.20)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 170,
  },
  pillText: { color: UI.text, fontSize: 11, fontWeight: "900" },

  backPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: UI.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginBottom: 12,
  },
  backPillText: { color: UI.text, fontWeight: "900", fontSize: 13 },

  playerHeaderCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    marginBottom: 12,
  },

  playerBadgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  playerBadge: {
    backgroundColor: UI.blueSoft,
    borderWidth: 1,
    borderColor: "rgba(47,107,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  playerBadgeText: { color: UI.text, fontSize: 11, fontWeight: "900" },

  playerTitle: { color: UI.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  playerSub: { color: UI.muted, fontSize: 12.5, fontWeight: "800", lineHeight: 17 },

  videoCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: "hidden",
    shadowColor: UI.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  videoWrap: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#EAF1FF" },
  video: { width: "100%", height: "100%" },

  fullBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,24,39,0.80)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fullBtnText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  hintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(2,6,23,0.06)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  hintText: { color: UI.text, fontWeight: "900", fontSize: 12 },
});