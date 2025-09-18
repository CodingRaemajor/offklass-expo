import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Colors } from "../../lib/colors";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";

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
    recent: "Recent Activity",
    empty: "No recent activity yet",
    actions: {
      cont: "Continue Learning",
      quiz: "Take Quiz",
      flash: "Flashcards",
      ai: "Ask AI",
    },
  },
  नेपाली: {
    hello: (n: string) => `नमस्ते, ${n}!`,
    sep: " • ",
    level: "स्तर",
    streak: "स्ट्रिक",
    quick: "छिटो कार्यहरू",
    recent: "हालको गतिविधि",
    empty: "अहिलेसम्म कुनै गतिविधि छैन",
    actions: {
      cont: "पढाइ जारी राख्नुहोस्",
      quiz: "क्विज दिनुहोस्",
      flash: "फ्ल्यासकार्ड",
      ai: "एआईसँग सोध्नुहोस्",
    },
  },
  اردو: {
    hello: (n: string) => `سلام، ${n}!`,
    sep: " • ",
    level: "سطح",
    streak: "سلسلہ",
    quick: "فوری اقدامات",
    recent: "حالیہ سرگرمی",
    empty: "ابھی کوئی سرگرمی نہیں",
    actions: {
      cont: "سیکھنا جاری رکھیں",
      quiz: "کوئز دیں",
      flash: "فلیش کارڈز",
      ai: "اے آئی سے پوچھیں",
    },
  },
  বাংলা: {
    hello: (n: string) => `হ্যালো, ${n}!`,
    sep: " • ",
    level: "লেভেল",
    streak: "স্ট্রিক",
    quick: "দ্রুত কাজ",
    recent: "সাম্প্রতিক কার্যকলাপ",
    empty: "এখনও কোনো কার্যকলাপ নেই",
    actions: {
      cont: "শেখা চালিয়ে যান",
      quiz: "কুইজ দিন",
      flash: "ফ্ল্যাশকার্ড",
      ai: "এআইকে জিজ্ঞাসা করুন",
    },
  },
  हिन्दी: {
    hello: (n: string) => `नमस्ते, ${n}!`,
    sep: " • ",
    level: "स्तर",
    streak: "स्ट्रिक",
    quick: "त्वरित कार्य",
    recent: "हाल की गतिविधि",
    empty: "अभी कोई गतिविधि नहीं",
    actions: {
      cont: "सीखना जारी रखें",
      quiz: "क्विज़ दें",
      flash: "फ्लैशकार्ड",
      ai: "एआई से पूछें",
    },
  },
} as const;

type Dict = typeof L10N[Lang extends keyof typeof L10N ? Lang : "English"];

/* --------------------------------- Screen --------------------------------- */

export default function Home() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<OnboardingData | null>(null);

  useEffect(() => {
    (async () => setUser(await loadJSON<OnboardingData | null>(ONBOARD_KEY, null)))();
  }, []);

  const lang = (user?.language as Lang) || "English";
  const T: Dict = (L10N as any)[LANGS.includes(lang) ? lang : "English"];
  const isRTL = lang === "اردو";
  const rtl = isRTL ? ({ writingDirection: "rtl" as "rtl", textAlign: "right" as const }) : undefined;

  const name = user?.name?.trim() || "Learner";
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const meta = `${user?.grade ?? "Grade 3"}${T.sep}${user?.language ?? "English"}`;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(16, insets.bottom + 16) }, // room above tab bar
        ]}
        bounces={false}
        overScrollMode="never"
      >
        {/* Hero */}
        <LinearGradient colors={["#A78BFA", "#7C3AED"]} style={styles.welcome}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, rtl]}>{T.hello(name)}</Text>
            <Text style={[styles.meta, rtl]}>{meta}</Text>
          </View>
        </LinearGradient>

        {/* Stats: Level + Streak */}
        <View style={styles.statsRow}>
          <StatTile label={T.level} value="1" scheme="indigo" />
          <StatTile label={T.streak} value="0" scheme="green" />
        </View>

        {/* Quick Actions */}
        <Text style={[styles.section, rtl]}>{T.quick}</Text>
        <View style={styles.actionGrid}>
          <ActionTile
            icon="play-circle-outline"
            label={T.actions.cont}
            onPress={() => router.push("/tabs/lessons")}
            scheme="blue"
            rtl={rtl}
          />
          <ActionTile
            icon="help-circle-outline"
            label={T.actions.quiz}
            onPress={() => router.push("/tabs/quizzes")}
            scheme="orange"
            rtl={rtl}
          />
          <ActionTile
            icon="albums-outline"
            label={T.actions.flash}
            onPress={() => router.push("/tabs/flashcards")}
            scheme="indigo"
            rtl={rtl}
          />
          {/* NEW — Ask AI */}
          <ActionTile
            icon="sparkles-outline"
            label={T.actions.ai}
            onPress={() => router.push("/tabs/ai")}
            scheme="purple"
            rtl={rtl}
          />
        </View>

        {/* Recent */}
        <Text style={[styles.section, rtl]}>{T.recent}</Text>
        <View style={styles.recentCard}>
          <Text style={[styles.recentEmpty, rtl]}>{T.empty}</Text>
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
    indigo: { bg: "#0B1130", border: "#28356E", pill: "#1F2A5A", icon: "#CFD9FF", iconName: "sparkles-outline" as const },
    green: { bg: "#0B1F1C", border: "#155E57", pill: "#065F46", icon: "#CFFAFE", iconName: "flame-outline" as const },
  }[scheme];

  return (
    <View style={[styles.tile, { backgroundColor: map.bg, borderColor: map.border }]}>
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
  onPress,
  scheme,
  rtl,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  scheme: "blue" | "orange" | "indigo" | "teal" | "purple";
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
}) {
  const map = {
    blue:   { bg: "#0B1730", border: "#294480", pill: "#1E3A8A", icon: "#CFE4FF" },
    orange: { bg: "#2B1406", border: "#8A4C1B", pill: "#7C2D12", icon: "#FFE7D1" },
    indigo: { bg: "#0B1130", border: "#28356E", pill: "#1F2A5A", icon: "#CFD9FF" },
    teal:   { bg: "#0B1F1C", border: "#155E57", pill: "#065F46", icon: "#CFFAFE" },
    // New purple variant for Ask AI
    purple: { bg: "#120E2B", border: "#4C2AC8", pill: "#3B2A8F", icon: "#E4D9FF" },
  }[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionTile, { backgroundColor: map.bg, borderColor: map.border }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: map.pill }]}>
        <Ionicons name={icon} size={22} color={map.icon} />
      </View>
      <Text style={[styles.actionLbl, rtl]} numberOfLines={2}>
        {label}
      </Text>
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
    backgroundColor: "#0E0D1B", // ensures no white band outside ScrollView
  },
  scroller: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    rowGap: 12,
    flexGrow: 1, // fills full height on short content screens
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
  section: { fontSize: 16, fontWeight: "900", marginTop: 4, color: "#F1F5F9" },

  /* Actions */
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  actionTile: {
    width: "48%",            // two columns, fits small phones
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    alignItems: "center",
    ...cardShadow,
  },
  actionLbl: { color: "#F1F5F9", fontWeight: "800", textAlign: "center", marginTop: 8 },

  /* Recent */
  recentCard: {
    backgroundColor: "#0B1220",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#28356E",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 84,
    ...cardShadow,
  },
  recentEmpty: { color: "#C7D2FE" },
});