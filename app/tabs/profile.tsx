// app/(tabs)/profile.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../../lib/colors";
import { loadJSON, ONBOARD_KEY, OnboardingData } from "../../lib/storage";
import { Ionicons } from "@expo/vector-icons";

/* ----------------------------- Lightweight i18n ---------------------------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    profile: string;
    lessons: string;
    quizzes: string;
    perfect: string;
    badges: string;
    clearLocal: string;
    resetTitle: string;
    resetMsg: string;
    cancel: string;
    confirm: string;
  }
> = {
  English: {
    profile: "Profile",
    lessons: "Lessons",
    quizzes: "Quizzes",
    perfect: "Perfect",
    badges: "Badges",
    clearLocal: "Clear Local Data",
    resetTitle: "Reset",
    resetMsg: "All local data will be cleared. Restart the app to see onboarding again.",
    cancel: "Cancel",
    confirm: "Clear",
  },
  नेपाली: {
    profile: "प्रोफाइल",
    lessons: "पाठ",
    quizzes: "प्रश्नोत्तरी",
    perfect: "उत्कृष्ट",
    badges: "ब्याज",
    clearLocal: "स्थानीय डाटा हटाउनुहोस्",
    resetTitle: "रिसेट",
    resetMsg: "सबै स्थानीय डाटा हटाइनेछ। फेरि सुरु गर्दा अनबोर्डिङ देखिनेछ।",
    cancel: "रद्द",
    confirm: "हटाउनुहोस्",
  },
  اردو: {
    profile: "پروفائل",
    lessons: "لیسنز",
    quizzes: "کوئز",
    perfect: "پرفیکٹ",
    badges: "بیجز",
    clearLocal: "لوکل ڈیٹا صاف کریں",
    resetTitle: "ری سیٹ",
    resetMsg: "تمام مقامی ڈیٹا صاف ہو جائے گا۔ آن بورڈنگ دوبارہ دیکھنے کے لیے ایپ ری اسٹارٹ کریں۔",
    cancel: "منسوخ",
    confirm: "صاف کریں",
  },
  বাংলা: {
    profile: "প্রোফাইল",
    lessons: "পাঠ",
    quizzes: "কুইজ",
    perfect: "পারফেক্ট",
    badges: "ব্যাজ",
    clearLocal: "লোকাল ডেটা মুছুন",
    resetTitle: "রিসেট",
    resetMsg: "সমস্ত লোকাল ডেটা মুছে যাবে। অনবোর্ডিং দেখতে অ্যাপটি আবার চালু করুন।",
    cancel: "বাতিল",
    confirm: "মুছুন",
  },
  हिन्दी: {
    profile: "प्रोफ़ाइल",
    lessons: "पाठ",
    quizzes: "क्विज़",
    perfect: "परफ़ेक्ट",
    badges: "बैज",
    clearLocal: "लोकल डेटा साफ करें",
    resetTitle: "रीसेट",
    resetMsg: "सारा लोकल डेटा हट जाएगा। ऑनबोर्डिंग फिर से देखने के लिए ऐप रीस्टार्ट करें।",
    cancel: "रद्द",
    confirm: "साफ करें",
  },
};

/* --------------------------------- Screen --------------------------------- */

export default function Profile() {
  const [user, setUser] = useState<OnboardingData | null>(null);

  useEffect(() => {
    (async () => setUser(await loadJSON<OnboardingData | null>(ONBOARD_KEY, null)))();
  }, []);

  const lang: Lang = (user?.language as Lang) || "English";
  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL ? { writingDirection: "rtl" as "rtl", textAlign: "right" as const } : undefined;

  const initials = (user?.name?.trim?.() || "Learner")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function confirmReset() {
    Alert.alert(T.resetTitle, T.resetMsg, [
      { text: T.cancel, style: "cancel" },
      {
        text: T.confirm,
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          Alert.alert(T.resetTitle, T.resetMsg);
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.page} bounces={false} overScrollMode="never">
      {/* Profile tile */}
      <View style={[styles.tile, styles.tileBlue]}>
        <View style={styles.tileHeader}>
          <View style={[styles.tileIcon, { backgroundColor: "#1E3A8A" }]}>
            <Ionicons name="person-circle-outline" size={20} color="#CFE4FF" />
          </View>
          <Text style={[styles.tileBadge, rtl]}>{T.profile}</Text>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nameText, rtl]}>{user?.name ?? "Learner"}</Text>
            <Text style={[styles.subText, rtl]}>
              {(user?.grade ?? "Grade 3") + " • " + (user?.language ?? "English")}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.grid}>
        <StatTile title={T.lessons} value="0" colorScheme="green" icon="school-outline" rtl={rtl} />
        <StatTile title={T.quizzes} value="0" colorScheme="orange" icon="help-circle-outline" rtl={rtl} />
        <StatTile title={T.perfect} value="0" colorScheme="indigo" icon="ribbon-outline" rtl={rtl} />
        <StatTile title={T.badges} value="0" colorScheme="purple" icon="trophy-outline" rtl={rtl} />
      </View>

      {/* Reset CTA */}
      <Pressable onPress={confirmReset} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        <LinearGradient
          colors={["#A78BFA", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cta}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.ctaText}>{T.clearLocal}</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

/* ----------------------------- Subcomponents ------------------------------ */

function StatTile({
  title,
  value,
  icon,
  colorScheme,
  rtl,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorScheme: "green" | "orange" | "indigo" | "purple";
  rtl?: { writingDirection: "rtl"; textAlign: "right" } | undefined;
}) {
  const scheme = {
    green: { bg: "#0B1F1C", border: "#155E57", pill: "#065F46", icon: "#CFFAFE" },
    orange: { bg: "#2B1406", border: "#8A4C1B", pill: "#7C2D12", icon: "#FFE7D1" },
    indigo: { bg: "#0B1130", border: "#28356E", pill: "#1F2A5A", icon: "#CFD9FF" },
    purple: { bg: "#1C0F2B", border: "#5A3B7E", pill: "#3C275A", icon: "#EAD9FF" },
  }[colorScheme];

  return (
    <View style={[styles.tile, { backgroundColor: scheme.bg, borderColor: scheme.border }]}>
      <View style={styles.tileHeader}>
        <View style={[styles.tileIcon, { backgroundColor: scheme.pill }]}>
          <Ionicons name={icon} size={18} color={scheme.icon} />
        </View>
        <Text style={[styles.tileBadge, rtl]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, rtl]}>{value}</Text>
      <Text style={[styles.subText, rtl]}>{title}</Text>
    </View>
  );
}

/* --------------------------------- Styles -------------------------------- */

const cardShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

const styles = StyleSheet.create({
  page: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: "#0E0D1B",
    gap: 14,
  },

  /* Generic tile */
  tile: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    ...cardShadow,
  },
  tileBlue: { backgroundColor: "#0B1730", borderColor: "#294480" },

  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tileIcon: {
    width: 32,
    height: 32,
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
    paddingVertical: 6,
    borderRadius: 999,
  },

  /* Profile row */
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#ffffff22",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff33",
  },
  avatarText: { color: "white", fontWeight: "900", fontSize: 18 },
  nameText: { color: "#F1F5F9", fontWeight: "900", fontSize: 18 },
  subText: { color: "#C7D2FE", opacity: 0.8, marginTop: 2 },

  /* Stats grid */
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statValue: { color: "#F1F5F9", fontWeight: "900", fontSize: 22, marginTop: 6 },

  /* CTA */
  cta: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...cardShadow,
  },
  ctaText: { color: "white", fontWeight: "900", fontSize: 16, letterSpacing: 0.3 },
});