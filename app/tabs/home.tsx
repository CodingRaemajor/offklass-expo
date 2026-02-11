import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Colors } from "../../lib/colors";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { getHomeSnapshot, type DaySummary } from "../../lib/progress";

/* ------------------------------- i18n helpers ------------------------------ */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N = {
  English: {
    hello: (n: string) => `Hello, ${n}!`,
    sep: " • ",
    level: "Level",
    streak: "Streak",
    quick: "Quick Actions",
    recent: "Today in Regina",
    empty: "No activity yet today",
    actions: {
      cont: "Continue Learning",
      quiz: "Take Quiz",
      flash: "Flashcards",
      ai: "Ask AI",
    },
    pathTitle: "Start here today",
    pathNextUp: "Next up for you",
    pathStepsTitle: "Today's plan",
    pathStep1: "1. Watch the lesson video",
    pathStep2: "2. Take the short quiz",
    pathStep3: "3. Review the flashcards",
    pathButton: "Start this lesson",
  },
  नेपाली: {
    hello: (n: string) => `नमस्ते, ${n}!`,
    sep: " • ",
    level: "स्तर",
    streak: "स्ट्रिक",
    quick: "छिटो कार्यहरू",
    recent: "आज रेजिना समय",
    empty: "आज कुनै गतिविधि छैन",
    actions: {
      cont: "पढाइ जारी राख्नुहोस्",
      quiz: "क्विज दिनुहोस्",
      flash: "फ्ल्यासकार्ड",
      ai: "एआईसँग सोध्नुहोस्",
    },
    pathTitle: "आज यहाँबाट सुरु गर्नुहोस्",
    pathNextUp: "तपाईंको अर्को पाठ",
    pathStepsTitle: "आजको योजना",
    pathStep1: "१. पाठको भिडियो हेर्नुहोस्",
    pathStep2: "२. सानो क्विज दिनुहोस्",
    pathStep3: "३. फ्ल्यासकार्ड दोहोर्याउनुहोस्",
    pathButton: "यो पाठ सुरु गर्नुहोस्",
  },
  اردو: {
    hello: (n: string) => `سلام، ${n}!`,
    sep: " • ",
    level: "سطح",
    streak: "سلسلہ",
    quick: "فوری اقدامات",
    recent: "آج (ریجائنا وقت)",
    empty: "آج ابھی کوئی سرگرمی نہیں",
    actions: {
      cont: "سیکھنا جاری رکھیں",
      quiz: "کوئز دیں",
      flash: "فلیش کارڈز",
      ai: "اے آئی سے پوچھیں",
    },
    pathTitle: "آج یہاں سے شروع کریں",
    pathNextUp: "آپ کا اگلا سبق",
    pathStepsTitle: "آج کا پلان",
    pathStep1: "1. سبق کی ویڈیو دیکھیں",
    pathStep2: "2. چھوٹا سا کوئز دیں",
    pathStep3: "3. فلیش کارڈز دہرائیں",
    pathButton: "یہ سبق شروع کریں",
  },
  বাংলা: {
    hello: (n: string) => `হ্যালো, ${n}!`,
    sep: " • ",
    level: "লেভেল",
    streak: "স্ট্রিক",
    quick: "দ্রুত কাজ",
    recent: "আজ (রেজাইনা সময়)",
    empty: "আজ এখনও কোনো কার্যকলাপ নেই",
    actions: {
      cont: "শেখা চালিয়ে যান",
      quiz: "কুইজ দিন",
      flash: "ফ্ল্যাশকার্ড",
      ai: "এআইকে জিজ্ঞাসা করুন",
    },
    pathTitle: "আজ এখান থেকে শুরু করো",
    pathNextUp: "তোমার পরের লেসন",
    pathStepsTitle: "আজকের প্ল্যান",
    pathStep1: "১. লেসনের ভিডিও দেখো",
    pathStep2: "২. ছোট কুইজ দাও",
    pathStep3: "৩. ফ্ল্যাশকার্ড রিভিউ করো",
    pathButton: "এই লেসন শুরু করো",
  },
  हिन्दी: {
    hello: (n: string) => `नमस्ते, ${n}!`,
    sep: " • ",
    level: "स्तर",
    streak: "स्ट्रिक",
    quick: "त्वरित विकल्प",
    recent: "आज (रेजाइना समय)",
    empty: "आज अभी कोई गतिविधि नहीं",
    actions: {
      cont: "सीखना जारी रखें",
      quiz: "क्विज़ दें",
      flash: "फ्लैशकार्ड",
      ai: "एआई से पूछें",
    },
    pathTitle: "आज यहाँ से शुरू करें",
    pathNextUp: "आपका अगला पाठ",
    pathStepsTitle: "आज की योजना",
    pathStep1: "1. पाठ का वीडियो देखें",
    pathStep2: "2. छोटा क्विज़ दें",
    pathStep3: "3. फ्लैशकार्ड दोहराएँ",
    pathButton: "यह पाठ शुरू करें",
  },
} as const;

type Dict = typeof L10N[Lang extends keyof typeof L10N ? Lang : "English"];

/* --------------------------------- Screen --------------------------------- */

export default function Home() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<OnboardingData | null>(null);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [todaySummary, setTodaySummary] = useState<DaySummary | null>(null);

  useEffect(() => {
    (async () => {
      setUser(await loadJSON<OnboardingData | null>(ONBOARD_KEY, null));
      const snap = await getHomeSnapshot();
      setStreak(snap.streak);
      setLevel(snap.level);
      setTodaySummary(snap.todaySummary);
    })();
  }, []);

  const lang = (user?.language as Lang) || "English";
  const T: Dict = (L10N as any)[LANGS.includes(lang) ? lang : "English"];
  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({
        writingDirection: "rtl" as "rtl",
        textAlign: "right" as const,
      })
    : undefined;

  const name = user?.name?.trim() || "Learner";
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const grade = user?.grade ?? "Grade 6";
  const subject = "Mathematics"; // Fixed to always show Mathematics
  const meta = `${grade}${T.sep}${subject}`; // Now shows "Grade 6 • Mathematics"
  const nextLessonTitle = `Unit 1: Place Value • ${subject} for ${grade}`; // Updated lesson title

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(16, insets.bottom + 16) },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        {/* Hero */}
        <LinearGradient colors={["#A78BFA", "#7C3AED"]} style={styles.welcome}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, rtl]}>{T.hello(name)}</Text>
            <Text style={[styles.meta, rtl]}>{meta}</Text>
          </View>
        </LinearGradient>

        {/* Stats: Level + Streak */}
        <View style={styles.statsRow}>
          <StatTile label={T.level} value={String(level)} scheme="indigo" />
          <StatTile label={T.streak} value={String(streak)} scheme="green" />
        </View>

        {/* Quick Actions FIRST */}
        <Text style={[styles.section, rtl]}>{T.quick}</Text>
        <View style={styles.actionGrid}>
          <ActionTile
            icon="play-circle-outline"
            label={T.actions.cont}
            subtitle="Follow your step-by-step path"
            onPress={() => router.push("/tabs/lessons")}
            scheme="blue"
            rtl={rtl}
          />
          <ActionTile
            icon="help-circle-outline"
            label={T.actions.quiz}
            subtitle="Use after a lesson to check yourself"
            onPress={() => router.push("/tabs/quizzes")}
            scheme="orange"
            rtl={rtl}
          />
          <ActionTile
            icon="albums-outline"
            label={T.actions.flash}
            subtitle="Review key ideas and formulas"
            onPress={() => router.push("/tabs/flashcards")}
            scheme="indigo"
            rtl={rtl}
          />
          <ActionTile
            icon="sparkles-outline"
            label={T.actions.ai}
            subtitle="Ask for help if you are stuck"
            onPress={() => router.push("/tabs/ai")}
            scheme="purple"
            rtl={rtl}
          />
        </View>

        {/* Start here card (Today's learning path) */}
        <View style={styles.pathCard}>
          <Text style={[styles.pathTitle, rtl]}>{T.pathTitle}</Text>

          <View className="flex-row" style={styles.pathNextRow}>
            <View style={styles.pathDot} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pathNextLabel, rtl]}>{T.pathNextUp}</Text>
              <Text style={[styles.pathNextLesson, rtl]}>
                {nextLessonTitle}
              </Text>
            </View>
          </View>

          <Text style={[styles.pathStepsTitle, rtl]}>{T.pathStepsTitle}</Text>
          <View style={styles.pathStepsList}>
            <Text style={[styles.pathStepText, rtl]}>{T.pathStep1}</Text>
            <Text style={[styles.pathStepText, rtl]}>{T.pathStep2}</Text>
            <Text style={[styles.pathStepText, rtl]}>{T.pathStep3}</Text>
          </View>

          <Pressable
            style={styles.pathButton}
            onPress={() => router.push("/tabs/lessons")}
          >
            <Text style={styles.pathButtonText}>{T.pathButton}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- Subcomponents ------------------------------ */

function StatTile({
  label,
  value,
  scheme,
}: {
  label: string;
  value: string;
  scheme: "indigo" | "green";
}) {
  const map = {
    indigo: {
      bg: "#0B1130",
      border: "#28356E",
      pill: "#1F2A5A",
      icon: "#CFD9FF",
      iconName: "sparkles-outline" as const,
    },
    green: {
      bg: "#0B1F1C",
      border: "#155E57",
      pill: "#065F46",
      icon: "#CFFAFE",
      iconName: "flame-outline" as const,
    },
  }[scheme];

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: map.bg, borderColor: map.border },
      ]}
    >
      <View style={styles.tileHeader}>
        <View style={[styles.tileIcon, { backgroundColor: map.pill }]}>
          <Ionicons name={map.iconName} size={18} color={map.icon} />
        </View>
        <Text style={styles.tileBadge}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ActionTile({
  icon,
  label,
  subtitle,
  onPress,
  scheme,
  rtl,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  scheme: "blue" | "orange" | "indigo" | "teal" | "purple";
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
}) {
  const map = {
    blue: {
      bg: "#0B1730",
      border: "#294480",
      pill: "#1E3A8A",
      icon: "#CFE4FF",
    },
    orange: {
      bg: "#2B1406",
      border: "#8A4C1B",
      pill: "#7C2D12",
      icon: "#FFE7D1",
    },
    indigo: {
      bg: "#0B1130",
      border: "#28356E",
      pill: "#1F2A5A",
      icon: "#CFD9FF",
    },
    teal: {
      bg: "#0B1F1C",
      border: "#155E57",
      pill: "#065F46",
      icon: "#CFFAFE",
    },
    purple: {
      bg: "#120E2B",
      border: "#4C2AC8",
      pill: "#3B2A8F",
      icon: "#E4D9FF",
    },
  }[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionTile,
        { backgroundColor: map.bg, borderColor: map.border },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: map.pill }]}>
        <Ionicons name={icon} size={22} color={map.icon} />
      </View>
      <Text style={[styles.actionLbl, rtl]} numberOfLines={2}>
        {label}
      </Text>
      {subtitle && (
        <Text style={[styles.actionSub, rtl]} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </Pressable>
  );
}

/* --------------------------------- Styles --------------------------------- */

const cardShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 5 },
  elevation: 5,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0E0D1B",
  },
  scroller: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    rowGap: 12,
    flexGrow: 1,
  },

  /* Hero */
  welcome: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
    ...cardShadow,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#00000022",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff33",
  },
  avatarTxt: { color: "white", fontWeight: "900", fontSize: 16 },
  hello: { color: "white", fontSize: 18, fontWeight: "900" },
  meta: { color: "white", opacity: 0.9, marginTop: 2 },

  /* Stats */
  statsRow: { flexDirection: "row", columnGap: 12 },
  tile: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    ...cardShadow,
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileBadge: {
    color: "#E5E7EB",
    fontWeight: "800",
    backgroundColor: "#FFFFFF10",
    borderColor: "#FFFFFF20",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statValue: { color: "#F1F5F9", fontWeight: "900", fontSize: 22 },

  /* Sections */
  section: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
    color: "#F1F5F9",
  },

  /* Path card */
  pathCard: {
    borderRadius: 16,
    backgroundColor: "#0B1220",
    borderWidth: 1.5,
    borderColor: "#28356E",
    padding: 14,
    rowGap: 10,
    ...cardShadow,
  },
  pathTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#E5E7EB",
  },
  pathNextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 8,
    marginTop: 6,
  },
  pathDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#4F46E5",
    marginTop: 4,
  },
  pathNextLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  pathNextLesson: {
    fontSize: 14,
    fontWeight: "800",
    color: "#E0E7FF",
    marginTop: 2,
  },
  pathStepsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#CBD5F5",
    marginTop: 6,
  },
  pathStepsList: {
    marginTop: 2,
    rowGap: 2,
  },
  pathStepText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  pathButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pathButtonText: {
    color: "#EEF2FF",
    fontWeight: "800",
    fontSize: 13,
  },

  /* Actions */
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  actionTile: {
    width: "48%",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    alignItems: "center",
    ...cardShadow,
  },
  actionLbl: {
    color: "#F1F5F9",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  actionSub: {
    color: "#9CA3AF",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },

  /* Recent */
  recentCard: {
    backgroundColor: "#0B1220",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#28356E",
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...cardShadow,
  },
  recentBody: {
    rowGap: 4,
  },
  recentLine: {
    color: "#C7D2FE",
    fontSize: 13,
  },
  recentEmpty: { color: "#C7D2FE" },
});