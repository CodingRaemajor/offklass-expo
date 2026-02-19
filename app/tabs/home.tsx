import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { getHomeSnapshot } from "../../lib/progress";

import DashboardHeader from "../../components/offklass/DashboardHeader";

/* ------------------------------- i18n helpers ------------------------------ */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N = {
  English: {
    sep: " • ",
    quick: "Quick Actions",
    actions: {
      cont: "Continue Learning",
      quiz: "Take Quiz",
      flash: "Flashcards",
      ai: "Ask AI",
    },
    subtitles: {
      cont: "Follow your step-by-step path",
      quiz: "Check yourself after a lesson",
      flash: "Review key ideas and formulas",
      ai: "Get help when you are stuck",
    },
  },
  नेपाली: {
    sep: " • ",
    quick: "छिटो कार्यहरू",
    actions: {
      cont: "पढाइ जारी राख्नुहोस्",
      quiz: "क्विज दिनुहोस्",
      flash: "फ्ल्यासकार्ड",
      ai: "एआईसँग सोध्नुहोस्",
    },
    subtitles: {
      cont: "चरणबद्ध तरिकाले अगाडि बढ्नुहोस्",
      quiz: "पाठपछि आफूलाई जाँच्नुहोस्",
      flash: "मुख्य कुरा दोहोर्याउनुहोस्",
      ai: "अड्किँदा मद्दत लिनुहोस्",
    },
  },
  اردو: {
    sep: " • ",
    quick: "فوری اقدامات",
    actions: {
      cont: "سیکھنا جاری رکھیں",
      quiz: "کوئز دیں",
      flash: "فلیش کارڈز",
      ai: "اے آئی سے پوچھیں",
    },
    subtitles: {
      cont: "مرحلہ وار راستہ فالو کریں",
      quiz: "سبق کے بعد خود کو چیک کریں",
      flash: "اہم نکات دہرائیں",
      ai: "پھنسی ہوئی جگہ پر مدد لیں",
    },
  },
  বাংলা: {
    sep: " • ",
    quick: "দ্রুত কাজ",
    actions: {
      cont: "শেখা চালিয়ে যান",
      quiz: "কুইজ দিন",
      flash: "ফ্ল্যাশকার্ড",
      ai: "এআইকে জিজ্ঞাসা করুন",
    },
    subtitles: {
      cont: "ধাপে ধাপে এগিয়ে যান",
      quiz: "লেসনের পরে নিজেকে যাচাই করুন",
      flash: "মূল বিষয়গুলো রিভিউ করুন",
      ai: "আটকে গেলে সাহায্য নিন",
    },
  },
  हिन्दी: {
    sep: " • ",
    quick: "त्वरित विकल्प",
    actions: {
      cont: "सीखना जारी रखें",
      quiz: "क्विज़ दें",
      flash: "फ्लैशकार्ड",
      ai: "एआई से पूछें",
    },
    subtitles: {
      cont: "स्टेप-बाय-स्टेप आगे बढ़ें",
      quiz: "पाठ के बाद खुद को जांचें",
      flash: "मुख्य बातें दोहराएँ",
      ai: "अटकने पर मदद लें",
    },
  },
} as const;

type Dict = typeof L10N[Lang extends keyof typeof L10N ? Lang : "English"];

/* --------------------------------- Screen --------------------------------- */

const BG = "#EEF4FF";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
  const isTablet = width >= 900;

  const [user, setUser] = useState<OnboardingData | null>(null);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    (async () => {
      const u = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      setUser(u);

      const snap = await getHomeSnapshot();
      setStreak(snap.streak);
      setLevel(snap.level);
    })();
  }, []);

  const lang = (user?.language as Lang) || "English";
  const T: Dict = (L10N as any)[LANGS.includes(lang) ? lang : "English"];

  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({
        writingDirection: "rtl" as const,
        textAlign: "right" as const,
      } as const)
    : undefined;

  const name = user?.name?.trim() || "Learner";
  const grade = user?.grade ?? "Grade 6";
  const sublabel = `${grade} Math${T.sep}offklass`;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <DashboardHeader name={name} sublabel={sublabel} streak={streak} level={level} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(16, insets.bottom + 16),
              paddingHorizontal: isTablet ? 28 : 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <Text style={[styles.sectionTitle, rtl, { fontSize: isTablet ? 20 : 16 }]}>{T.quick}</Text>

          <View style={styles.grid}>
            <ActionCard
              icon="play-circle-outline"
              title={T.actions.cont}
              subtitle={T.subtitles.cont}
              onPress={() => router.push("/tabs/lessons")}
              rtl={rtl}
            />
            <ActionCard
              icon="help-circle-outline"
              title={T.actions.quiz}
              subtitle={T.subtitles.quiz}
              onPress={() => router.push("/tabs/quizzes")}
              rtl={rtl}
            />
            <ActionCard
              icon="albums-outline"
              title={T.actions.flash}
              subtitle={T.subtitles.flash}
              onPress={() => router.push("/tabs/flashcards")}
              rtl={rtl}
            />
            <ActionCard
              icon="sparkles-outline"
              title={T.actions.ai}
              subtitle={T.subtitles.ai}
              onPress={() => router.push("/tabs/ai")}
              rtl={rtl}
            />
          </View>

          {/* remaining space */}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ----------------------------- Subcomponents ------------------------------ */

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
  rtl,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  rtl?: { writingDirection: "rtl"; textAlign: "right" };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.96 },
      ]}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={24} color="#2F6BFF" />
      </View>

      <Text style={[styles.cardTitle, rtl]} numberOfLines={2}>
        {title}
      </Text>

      <Text style={[styles.cardSub, rtl]} numberOfLines={2}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

/* --------------------------------- Styles --------------------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },

  scroll: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingTop: 16 },

  sectionTitle: {
    color: "#111827",
    fontWeight: "900",
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },

  card: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(47,107,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  cardTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 14,
  },
  cardSub: {
    color: "rgba(17,24,39,0.70)",
    fontWeight: "700",
    marginTop: 4,
    fontSize: 12,
  },
});
