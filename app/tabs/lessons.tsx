// app/(tabs)/lessons.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  LayoutChangeEvent,
  GestureResponderEvent,
  PanResponder,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
    "Unit 3: Multiplication By 1-Digit Numbers",
    "Unit 4: Multiplication By 2-Digit Numbers",
    "Unit 5: Division",
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
      status: "available",
    },
    {
      unit: "Unit 3: Multiplication By 1-Digit Numbers",
      title: "Unit 3: Multiplication By 1-Digit Numbers",
      description:
        "Understand multiplication concepts, times tables, and solving multiplication problems.",
      status: "available",
    },
    {
      unit: "Unit 4: Multiplication By 2-Digit Numbers",
      title: "Unit 4: Multiplication By 2-Digit Numbers",
      description:
        "Learn multi-digit multiplication techniques and solve complex problems.",
      status: "available",
    },
    {
      unit: "Unit 5: Division",
      title: "Unit 5: Division",
      description:
        "Learn division basics, understanding remainders, and solving division problems.",
      status: "available",
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
      source: require("../../assets/videos/Lesson_1U1.mp4"),
    },
    {
      id: "m2",
      title: "Comparing Two-Digit Numbers",
      description: "Discover how to compare numbers using place value.",
      unit: "Unit 1: Place Value",
      topic: "Comparing Numbers",
      source: require("../../assets/videos/Lesson_2U1.mp4"),
    },
    {
      id: "m3",
      title: "Hundreds Place Introduction",
      description: "Explore three-digit numbers and the hundreds place.",
      unit: "Unit 1: Place Value",
      topic: "Three-Digit Numbers",
      source: require("../../assets/videos/Lesson_3U1.mp4"),
    },
    {
      id: "m4",
      title: "Expanded Form",
      description: "Learn to write numbers in expanded form using place value.",
      unit: "Unit 1: Place Value",
      topic: "Expanded Notation",
      source: require("../../assets/videos/Lesson_4U1.mp4"),
    },
    {
      id: "m5",
      title: " Understanding Place Value When Adding ",
      description: "This video shows that in 40,762 + 30,473, “carrying” is actually regrouping 13 tens into 1 hundred and 3 tens using place value..",
      unit: "Unit 2: Addition & Subtraction",
      topic: "Place Value in Addition",
      source: require("../../assets/videos/Lesson_1U2.mp4"),
    },
    {
      id: "m6",
      title: " Adding Multi-Digit Numbers with Regrouping",
      description: "Learn how to add multi-digit numbers with regrouping.",
      unit: "Unit 2: Addition & Subtraction",
      topic: "Addition with Regrouping",
      source: require("../../assets/videos/Lesson_2U2.mp4"),
    },
    {
      id: "m7",
      title: " Understanding Place Value When Subtracting",
      description: "Using 1000 − 528, the video shows regrouping across zeros to subtract in each column..",
      unit: "Unit 2: Addition & Subtraction",
      topic: "Place Value in Subtraction",
      source: require("../../assets/videos/Lesson_3U2.mp4"),
    },
    {
      id: "m8",
      title: "Subtracting Multi-Digit Numbers with Regrouping",
      description: "This video explains the standard algorithm for subtracting 389,002 − 76,151, focusing on alignment and regrouping when zeros appear in the top number.",
      unit: "Unit 2: Addition & Subtraction",
      topic: "Subtraction with Regrouping",
      source: require("../../assets/videos/Lesson_4U2.mp4"),
    },
    {
      id: "m9",
      title: "Comparing with Multiplication",
      description: "This video shows how to convert verbal comparisons like “48 is six times as many as 8” into the multiplication equation 48 = 6 × 8.",
      unit: "Unit 3: Multiplication By 1-Digit Numbers",
      topic: "Place Value in Multiplication",
      source: require("../../assets/videos/Lesson_1U3.mp4"),
    },
    {
      id: "m10",
      title: " Multiplication by 10, 100, and 1,000",
      description: "This video explains that multiplying by powers of ten adds zeros to a number (10 → one zero, 100 → two, 1,000 → three).",
      unit: "Unit 3: Multiplication By 1-Digit Numbers",
      topic: "Multiplying by Powers of 10",
      source: require("../../assets/videos/Lesson_2U3.mp4"),
    },
    {
      id: "m11",
      title: " Multi-Digit Multiplication (Models)",
      description: "This video uses the distributive property and an area model to solve 56 × 8 by splitting 56 into 50 + 6 and adding 400 + 48 = 448.",
      unit: "Unit 3: Multiplication By 1-Digit Numbers",
      topic: "Area Models for Multiplication",
      source: require("../../assets/videos/Lesson_3U3.mp4"),
    },
    {
      id: "m12",
      title: "  Estimating Products ",
      description: "This video shows how to estimate products by rounding numbers before multiplying (e.g., 58 × 6 ≈ 60 × 6 = 360).",
      unit: "Unit 3: Multiplication By 1-Digit Numbers",
      topic: "Estimating Products",
      source: require("../../assets/videos/Lesson_4U3.mp4"),
    },
    {
      id: "m13",
      title: "Multiply with Partial Products",
      description: "This video shows the partial products method for 37 × 6 by multiplying 6×7 and 6×30, then adding the results.",
      unit: "Unit 3: Multiplication By 1-Digit Numbers",
      topic: "Partial Products",
      source: require("../../assets/videos/Lesson_5U3.mp4"),
    },
    {
      id: "m14",
      title: "Multiply by 10s",
      description: "This video explains 40 × 70 by multiplying 4 × 7 = 28 and then adding two zeros to get 2,800.",
      unit: "Unit 4: Multiplication By 2-Digit Numbers",
      topic: "Multiplying by 10",
      source: require("../../assets/videos/Lesson_1U4.mp4"),
    },
    {
      id: "m15",
      title: " Multiply 2-Digit Numbers with Area Models",
      description: "This video uses a 2×2 grid to solve 16 × 27 by breaking the numbers into (10 + 6) and (20 + 7) and adding the partial products.",
      unit: "Unit 4: Multiplication By 2-Digit Numbers",
      topic: "Area Models for Multiplication",
      source: require("../../assets/videos/Lesson_2U4.mp4"),
    },
    {
      id: "m16",
      title: "Estimate Products (2-digit numbers)",
      description: "This video shows how to estimate products by rounding numbers to the nearest ten, such as 44 × 78 ≈ 40 × 80 = 3,200.",
      unit: "Unit 4: Multiplication By 2-Digit Numbers",
      topic: " Estimating 2-digit multiplication",
      source: require("../../assets/videos/Lesson_3U4.mp4"),
    },
    {
      id: "m17",
      title: "Multiply 2-Digit Numbers with Partial Products",
      description: "This video shows how to solve 26 × 37 by stacking the four partial products from tens and ones in vertical multiplication.",
      unit: "Unit 4: Multiplication By 2-Digit Numbers",
      topic: "Partial Products",
      source: require("../../assets/videos/Lesson_4U4.mp4"),
    },
    {
      id: "m18",
      title: "Remainders",
      description: "This video explains that when a number can’t be divided equally, the remainder is the amount left over after making equal groups.",
      unit: "Unit 5: Division",
      topic: "Introduction to remainders",
      source: require("../../assets/videos/Lesson_1U5.mp4"),
    },
    {
      id: "m19",
      title: " Divide Multiples of 10, 100, and 1,000 by 1-Digit Numbers",
      description: "This video shows how basic division facts help solve larger problems, like using 12 ÷ 3 = 4 to find 1,200 ÷ 3 = 400.",
      unit: "Unit 5: Division",
      topic: " Quotients that are multiples of 10",
      source: require("../../assets/videos/Lesson_2U5.mp4"),
    },
    {
      id: "m20",
      title: "Division with Place Value",
      description: "This video demonstrates how to use place value to solve division problems, such as 1,200 ÷ 3.",
      unit: "Unit 5: Division",
      topic: "Division using place value",
      source: require("../../assets/videos/Lesson_3U5.mp4"),
    },
    {
      id: "m21",
      title: "Division with Area Models",
      description: "This video uses a rectangle model to show division by finding the missing side when the area and one side are known.",
      unit: "Unit 5: Division",
      topic: "Division with Area Models",
      source: require("../../assets/videos/Lesson_4U5.mp4"),
    },
    {
      id: "m22",
      title: "Estimate Quotients",
      description: "This video shows how to estimate division using compatible numbers that are easy to divide.",
      unit: "Unit 5: Division",
      topic: "Estimating Quotients",
      source: require("../../assets/videos/Lesson_5U5.mp4"),
    },
    {
      id: "m23",
      title: "Multi-Digit Division with Partial Quotients",
      description: "This video introduces the partial quotients method, dividing by subtracting large chunks (like 10 or 100) until the total reaches zero.",
      unit: "Unit 5: Division",
      topic: "Introduction to division with partial quotients",
      source: require("../../assets/videos/Lesson_6U5.mp4"),
    },
    {
      id: "m24",
      title: "Multiplication, Division Word Problems",
      description: "This video shows how to solve real-world problems involving multiplication and division.",
      unit: "Unit 5: Division",
      topic: "Word Problems",
      source: require("../../assets/videos/Lesson_7U5.mp4"),
    },
    {
      id: "m25",
      title: "Multi-Step Word Problems",
      description: "This video shows how to solve a two-step word problem and use estimation to check if the answer is reasonable.",
      unit: "Unit 5: Division",
      topic: "2-step estimation word problem",
      source: require("../../assets/videos/Lesson_8U5.mp4"),
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
    watched: string;
    markComplete: string;
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
      "Unit 3: Multiplication By 1-Digit Numbers": "Unit 3: Multiplication By 1-Digit Numbers",
      "Unit 4: Multiplication By 2-Digit Numbers": "Unit 4: Multiplication By 2-Digit Numbers",
      "Unit 5: Division": "Unit 5: Division",
    },
    comingSoon: "Coming Soon",
    tapToPlay: "Tap to play",
    back: "Back",
    unitsHeading: "Units",
    videosHeading: "Videos",
    full: "Full",
    watched: "Watched",
    markComplete: "Great job! Lesson completed",
  },
  नेपाली: {
    title: "पाठहरू",
    subtitle: "इकाई छान्नुहोस् र रमाइला भिडियो हेर्नुहोस् ✨",
    subjects: { Math: "गणित" },
    units: {
      "All Units": "सबै इकाई",
      "Unit 1: Place Value": "इकाई १: स्थानीय मान",
      "Unit 2: Addition & Subtraction": "इकाई २: जोड र घटाउ",
      "Unit 3: Multiplication By 1-Digit Numbers": "इकाई ३: 1-Digit गुणन",
      "Unit 4: Multiplication By 2-Digit Numbers": "इकाई ४: 2-Digit गुणन",
      "Unit 5: Division": "इकाई ५: भाग",
    },
    comingSoon: "छिट्टै आउँदैछ",
    tapToPlay: "खेल्न ट्याप गर्नुहोस्",
    back: "फर्कनुहोस्",
    unitsHeading: "इकाईहरू",
    videosHeading: "भिडियोहरू",
    full: "फुल",
    watched: "हेरियो",
    markComplete: "राम्रो भयो! पाठ पूरा भयो",
  },
  اردو: {
    title: "اسباق",
    subtitle: "یونٹ منتخب کریں اور مزے کی ویڈیوز دیکھیں ✨",
    subjects: { Math: "ریاضی" },
    units: {
      "All Units": "تمام اکائیاں",
      "Unit 1: Place Value": "یونٹ ١: جگہ کی قدر",
      "Unit 2: Addition & Subtraction": "یونٹ ٢: جمع اور تفریق",
      "Unit 3: Multiplication By 1-Digit Numbers": "یونٹ ٣: 1--digit اعداد کا ضرب",
      "Unit 4: Multiplication By 2-Digit Numbers": "یونٹ ٤: 2-digit اعداد کا ضرب",
      "Unit 5: Division": "یونٹ ٥: تقسیم",
    },
    comingSoon: "جلد آرہا ہے",
    tapToPlay: "چلانے کے لیے ٹیپ کریں",
    back: "واپس",
    unitsHeading: "یونٹس",
    videosHeading: "ویڈیوز",
    full: "فل",
    watched: "دیکھ لیا",
    markComplete: "بہت خوب! سبق مکمل ہوگیا",
  },
  বাংলা: {
    title: "পাঠসমূহ",
    subtitle: "ইউনিট বাছুন আর মজার ভিডিও দেখুন ✨",
    subjects: { Math: "গণিত" },
    units: {
      "All Units": "সমস্ত ইউনিট",
      "Unit 1: Place Value": "ইউনিট ১: স্থানীয় মান",
      "Unit 2: Addition & Subtraction": "ইউনিট ২: যোগ ও বিয়োগ",
      "Unit 3: Multiplication By 1-Digit Numbers": "ইউনিট ৩: 1-Digit গুণ",
      "Unit 4: Multiplication By 2-Digit Numbers": "ইউনিট ৪: 2-Digit গুণ",
      "Unit 5: Division": "ইউনিট ৫: ভাগ",
    },
    comingSoon: "শীঘ্রই আসছে",
    tapToPlay: "চালাতে ট্যাপ করুন",
    back: "ফিরে যান",
    unitsHeading: "ইউনিট",
    videosHeading: "ভিডিও",
    full: "ফুল",
    watched: "দেখা হয়েছে",
    markComplete: "দারুণ! পাঠ সম্পূর্ণ",
  },
  हिन्दी: {
    title: "पाठ",
    subtitle: "इकाई चुनें और मज़ेदार वीडियो देखें ✨",
    subjects: { Math: "गणित" },
    units: {
      "All Units": "सभी इकाइयाँ",
      "Unit 1: Place Value": "इकाई १: स्थानीय मान",
      "Unit 2: Addition & Subtraction": "इकाई २: जोड़ और घटाव",
      "Unit 3: Multiplication By 1-Digit Numbers": "इकाई ३: 1-Digit गुणन",
      "Unit 4: Multiplication By 2-Digit Numbers": "इकाई ४: 2-Digit गुणन",
      "Unit 5: Division": "इकाई ५: भाग",
    },
    comingSoon: "जल्द आ रहा है",
    tapToPlay: "चलाने के लिए टैप करें",
    back: "वापस",
    unitsHeading: "इकाइयाँ",
    videosHeading: "वीडियो",
    full: "फुल",
    watched: "देख लिया",
    markComplete: "बहुत बढ़िया! पाठ पूरा हुआ",
  },
};

/* ----------------------------- Completion storage ------------------------------ */

const LESSON_PROGRESS_KEY = "offklass.lessonCompletion.v1";

type CompletedLessonsMap = Record<string, boolean>;

async function getCompletedLessons(): Promise<CompletedLessonsMap> {
  try {
    const raw = await AsyncStorage.getItem(LESSON_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveCompletedLesson(lessonId: string): Promise<CompletedLessonsMap> {
  try {
    const current = await getCompletedLessons();
    const next = { ...current, [lessonId]: true };
    await AsyncStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return {};
  }
}

function formatTime(ms: number) {
  if (!ms || ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

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
        : unitDesc.unit === "Unit 3: Multiplication By 1-Digit Numbers"
          ? ("grid-outline" as const)
          : unitDesc.unit === "Unit 4: Multiplication By 2-Digit Numbers"
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
  completed,
  watchedLabel,
}: {
  lesson: VideoLesson;
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
  onPress: () => void;
  completed?: boolean;
  watchedLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        completed && styles.completedTile,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.97 },
      ]}
    >
      <View style={styles.lessonTopRow}>
        <View style={[styles.tileIcon, { backgroundColor: UI.yellowSoft, marginBottom: 0 }]}>
          <Ionicons name="play-circle-outline" size={24} color={UI.orange} />
        </View>

        {completed ? (
          <View style={styles.watchedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={UI.green} />
            <Text style={styles.watchedBadgeText}>{watchedLabel}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.tileTitle, rtl, { marginTop: 10 }]} numberOfLines={2}>
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

/* ------------------------------ Player View ----------------------------- */

function LessonPlayer({
  lesson,
  T,
  rtl,
  isTablet,
  paddingX,
  completed,
  onMarkedComplete,
}: {
  lesson: VideoLesson;
  T: (typeof L10N)[Lang];
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
  isTablet: boolean;
  paddingX: number;
  completed: boolean;
  onMarkedComplete: (lessonId: string) => void;
}) {
  const videoRef = useRef<Video>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [localCompleted, setLocalCompleted] = useState(completed);

  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const wasPlayingBeforeDrag = useRef(false);

  useEffect(() => {
    setLocalCompleted(completed);
  }, [completed, lesson.id]);

  const markCompleteOnce = async () => {
    if (localCompleted) return;
    setLocalCompleted(true);
    onMarkedComplete(lesson.id);
  };

  const onStatus = (st: AVPlaybackStatus) => {
    if (!st.isLoaded) {
      setIsLoaded(false);
      setIsPlaying(false);
      return;
    }

    setIsLoaded(true);
    setIsPlaying(st.isPlaying ?? false);

    const pos = st.positionMillis ?? 0;
    const dur = st.durationMillis ?? 0;

    if (!isDragging) {
      setPositionMillis(pos);
    }
    setDurationMillis(dur);

    const progress = dur > 0 ? pos / dur : 0;

    if (st.didJustFinish || progress >= 0.9) {
      markCompleteOnce();
    }
  };

  const togglePlayPause = async () => {
    try {
      if (!isLoaded) return;

      if (isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    } catch {}
  };

  const openFullscreen = async () => {
    try {
      await videoRef.current?.presentFullscreenPlayer();
    } catch {}
  };

  const seekTo = async (nextMillis: number) => {
    try {
      if (!isLoaded || durationMillis <= 0) return;
      const safe = Math.max(0, Math.min(durationMillis, nextMillis));
      await videoRef.current?.setPositionAsync(safe);
      setPositionMillis(safe);
    } catch {}
  };

  const seekBy = async (deltaMs: number) => {
    await seekTo(positionMillis + deltaMs);
  };

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const getProgressFromX = (x: number) => {
    if (trackWidth <= 0) return 0;
    return clamp(x / trackWidth, 0, 1);
  };

  const commitSeekFromProgress = async (progressValue: number) => {
    if (!isLoaded || durationMillis <= 0) return;
    const target = progressValue * durationMillis;
    await seekTo(target);
  };

  const onTrackPress = async (e: GestureResponderEvent) => {
    if (!isLoaded || durationMillis <= 0 || trackWidth <= 0) return;
    const progressValue = getProgressFromX(e.nativeEvent.locationX);
    setDragProgress(progressValue);
    await commitSeekFromProgress(progressValue);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: async (evt) => {
          if (!isLoaded || durationMillis <= 0 || trackWidth <= 0) return;

          wasPlayingBeforeDrag.current = isPlaying;
          setIsDragging(true);

          const progressValue = getProgressFromX(evt.nativeEvent.locationX);
          setDragProgress(progressValue);

          try {
            if (isPlaying) {
              await videoRef.current?.pauseAsync();
            }
          } catch {}
        },

        onPanResponderMove: (evt) => {
          if (!isLoaded || durationMillis <= 0 || trackWidth <= 0) return;
          const progressValue = getProgressFromX(evt.nativeEvent.locationX);
          setDragProgress(progressValue);
        },

        onPanResponderRelease: async (evt) => {
          if (!isLoaded || durationMillis <= 0 || trackWidth <= 0) {
            setIsDragging(false);
            return;
          }

          const progressValue = getProgressFromX(evt.nativeEvent.locationX);
          setDragProgress(progressValue);
          await commitSeekFromProgress(progressValue);
          setIsDragging(false);

          try {
            if (wasPlayingBeforeDrag.current) {
              await videoRef.current?.playAsync();
            }
          } catch {}
        },

        onPanResponderTerminate: async (evt) => {
          if (!isLoaded || durationMillis <= 0 || trackWidth <= 0) {
            setIsDragging(false);
            return;
          }

          const progressValue = getProgressFromX(evt.nativeEvent.locationX);
          setDragProgress(progressValue);
          await commitSeekFromProgress(progressValue);
          setIsDragging(false);

          try {
            if (wasPlayingBeforeDrag.current) {
              await videoRef.current?.playAsync();
            }
          } catch {}
        },
      }),
    [durationMillis, isLoaded, isPlaying, trackWidth]
  );

  const actualProgress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const progress = isDragging ? dragProgress : actualProgress;
  const previewPositionMillis = durationMillis > 0 ? progress * durationMillis : 0;

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
          <View
            style={[
              styles.playerBadge,
              { backgroundColor: UI.pinkSoft, borderColor: "rgba(236,72,153,0.20)" },
            ]}
          >
            <Text style={styles.playerBadgeText} numberOfLines={1}>
              {lesson.topic}
            </Text>
          </View>

          {localCompleted ? (
            <View style={styles.completedPlayerBadge}>
              <Ionicons name="checkmark-circle" size={14} color={UI.green} />
              <Text style={styles.completedPlayerBadgeText}>{T.watched}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.playerTitle, rtl]} numberOfLines={2}>
          {lesson.title}
        </Text>
        <Text style={[styles.playerSub, rtl]} numberOfLines={3}>
          {lesson.description}
        </Text>
      </View>

      <View style={[styles.videoCard, isTablet && { borderRadius: 22 }]}>
        <View style={styles.videoWrap}>
          <Video
            ref={videoRef}
            source={lesson.source}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            shouldPlay={false}
            onPlaybackStatusUpdate={onStatus}
          />

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

          {!isLoaded && (
            <View style={styles.hintOverlay} pointerEvents="none">
              <View style={styles.hintPill}>
                <Ionicons name="hand-left-outline" size={16} color={UI.text} />
                <Text style={styles.hintText}>Tap play, then tap “Full” for best controls</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.controlsWrap}>
          <View style={styles.controlsTopRow}>
            <View style={styles.playerButtonsRow}>
              <Pressable
                onPress={() => seekBy(-10000)}
                style={({ pressed }) => [
                  styles.secondaryControlBtn,
                  pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
                ]}
              >
                <Ionicons name="play-back" size={16} color={UI.text} />
                <Text style={styles.secondaryControlText}>10s</Text>
              </Pressable>

              <Pressable
                onPress={togglePlayPause}
                style={({ pressed }) => [
                  styles.playBtn,
                  pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
                ]}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={18}
                  color="#fff"
                  style={{ marginLeft: isPlaying ? 0 : 2 }}
                />
              </Pressable>

              <Pressable
                onPress={() => seekBy(10000)}
                style={({ pressed }) => [
                  styles.secondaryControlBtn,
                  pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
                ]}
              >
                <Ionicons name="play-forward" size={16} color={UI.text} />
                <Text style={styles.secondaryControlText}>10s</Text>
              </Pressable>
            </View>

            <View style={styles.timePill}>
              <Text style={styles.timeText}>
                {formatTime(isDragging ? previewPositionMillis : positionMillis)}
              </Text>
              <Text style={styles.timeDivider}>/</Text>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>
          </View>

          <Pressable onPress={onTrackPress} style={styles.progressTouchArea}>
            <View style={styles.sliderOuter}>
              <View style={styles.progressTrack} onLayout={onTrackLayout}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />

                <View
                  style={[
                    styles.progressThumb,
                    {
                      left: `${progress * 100}%`,
                      transform: [{ translateX: -10 }, { scale: isDragging ? 1.12 : 1 }],
                    },
                  ]}
                  {...panResponder.panHandlers}
                />
              </View>
            </View>
          </Pressable>

          {localCompleted ? (
            <View style={styles.completeRow}>
              <Ionicons name="checkmark-circle" size={18} color={UI.green} />
              <Text style={styles.completeText}>{T.markComplete}</Text>
            </View>
          ) : (
            <Text style={styles.helperText}>
              Drag the slider or tap the bar to move through the video
            </Text>
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
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  const params = useLocalSearchParams<{ lessonId?: string }>();

  const [subject, setSubject] = useState<Subject>("Math");
  const [unit, setUnit] = useState<Unit>(UNITS["Math"][0]);
  const [lang, setLang] = useState<Lang>("English");
  const [completedLessons, setCompletedLessons] = useState<CompletedLessonsMap>({});

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const l = (saved?.language as Lang) || "English";
      const safeLang = (LANGS as readonly string[]).includes(l) ? l : "English";
      setLang(safeLang as Lang);

      const savedCompleted = await getCompletedLessons();
      setCompletedLessons(savedCompleted);
    })();
  }, []);

  const markLessonCompleted = async (lessonId: string) => {
    const updated = await saveCompletedLesson(lessonId);
    setCompletedLessons((prev) => ({
      ...prev,
      ...updated,
      [lessonId]: true,
    }));
  };

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
        <LessonPlayer
          lesson={selectedLesson}
          T={T}
          rtl={rtl}
          isTablet={isTablet}
          paddingX={paddingX}
          completed={!!completedLessons[selectedLesson.id]}
          onMarkedComplete={markLessonCompleted}
        />
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
                    completed={!!completedLessons[lesson.id]}
                    watchedLabel={T.watched}
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
    shadowOpacity: 0.1,
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
    shadowOpacity: 0.1,
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
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  completedTile: {
    borderColor: "rgba(22,163,74,0.24)",
    backgroundColor: "rgba(255,255,255,0.96)",
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

  lessonTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },

  watchedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(22,163,74,0.10)",
    borderColor: "rgba(22,163,74,0.20)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  watchedBadgeText: {
    color: "#14532D",
    fontSize: 10.5,
    fontWeight: "900",
  },

  tileTitle: { color: UI.text, fontWeight: "900", fontSize: 14 },
  tileSub: { color: UI.muted, fontWeight: "800", marginTop: 4, fontSize: 12, lineHeight: 16 },

  tileFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

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
    shadowOpacity: 0.1,
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

  completedPlayerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22,163,74,0.10)",
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.22)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  completedPlayerBadgeText: { color: "#14532D", fontSize: 11, fontWeight: "900" },

  playerTitle: { color: UI.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  playerSub: { color: UI.muted, fontSize: 12.5, fontWeight: "800", lineHeight: 17 },

  videoCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: "hidden",
    shadowColor: UI.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  videoWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#EAF1FF",
    position: "relative",
  },
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

  controlsWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  controlsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },

  playerButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  secondaryControlBtn: {
    minWidth: 62,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(47,107,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(47,107,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
  },
  secondaryControlText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: "900",
  },

  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: UI.blue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: UI.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(47,107,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(47,107,255,0.14)",
  },
  timeText: {
    color: UI.text,
    fontSize: 12,
    fontWeight: "900",
  },
  timeDivider: {
    color: UI.muted,
    fontSize: 12,
    fontWeight: "900",
  },

  progressTouchArea: {
    paddingVertical: 10,
  },
  sliderOuter: {
    justifyContent: "center",
  },
  progressTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#DFE7FB",
    borderRadius: 999,
    overflow: "visible",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    backgroundColor: UI.green,
    borderRadius: 999,
  },
  progressThumb: {
    position: "absolute",
    top: -5,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: UI.green,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: UI.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  helperText: {
    marginTop: 10,
    color: UI.muted,
    fontSize: 12,
    fontWeight: "800",
  },

  completeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(22,163,74,0.08)",
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.16)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  completeText: {
    color: "#14532D",
    fontSize: 12.5,
    fontWeight: "900",
  },
});