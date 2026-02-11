import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Chip from "../components/Chip";
import { saveJSON, ONBOARD_KEY, OnboardingData } from "../lib/storage";
import { router } from "expo-router";

/* ---------- constants ---------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const GRADES = [
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
];

/* ---------- lightweight i18n ---------- */

const translations: Record<
  Lang,
  {
    nameBadge: string;
    langBadge: string;
    gradeBadge: string;
    whoAreYou: string;
    chooseLang: string;
    whichGrade: string;
    enterName: string;
    continue: string;
  }
> = {
  English: {
    nameBadge: "Name",
    langBadge: "Language",
    gradeBadge: "Grade",
    whoAreYou: "Who are you?",
    chooseLang: "Choose your language",
    whichGrade: "What grade are you in?",
    enterName: "Enter your name",
    continue: "Continue",
  },
  नेपाली: {
    nameBadge: "नाम",
    langBadge: "भाषा",
    gradeBadge: "कक्षा",
    whoAreYou: "तपाईंको नाम के हो?",
    chooseLang: "भाषा छान्नुहोस्",
    whichGrade: "तपाईं कुन कक्षामा हुनुहुन्छ?",
    enterName: "तपाईंको नाम लेख्नुहोस्",
    continue: "जारी राख्नुहोस्",
  },
  اردو: {
    nameBadge: "نام",
    langBadge: "زبان",
    gradeBadge: "جماعت",
    whoAreYou: "آپ کا نام کیا ہے؟",
    chooseLang: "زبان منتخب کریں",
    whichGrade: "آپ کس جماعت میں ہیں؟",
    enterName: "اپنا نام لکھیں",
    continue: "جاری رکھیں",
  },
  বাংলা: {
    nameBadge: "নাম",
    langBadge: "ভাষা",
    gradeBadge: "শ্রেণি",
    whoAreYou: "আপনার নাম কী?",
    chooseLang: "ভাষা নির্বাচন করুন",
    whichGrade: "আপনি কোন শ্রেণিতে পড়েন?",
    enterName: "আপনার নাম লিখুন",
    continue: "চালিয়ে যান",
  },
  हिन्दी: {
    nameBadge: "नाम",
    langBadge: "भाषा",
    gradeBadge: "कक्षा",
    whoAreYou: "आपका नाम क्या है?",
    chooseLang: "भाषा चुनें",
    whichGrade: "आप किस कक्षा में हैं?",
    enterName: "अपना नाम लिखें",
    continue: "जारी रखें",
  },
};

/* ---------- component ---------- */

export default function Onboarding() {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<Lang>("English");
  const [grade, setGrade] = useState("Grade 3");
  const [nameFocused, setNameFocused] = useState(false);

  const L = useMemo(() => translations[language], [language]);

  const isRTL = language === "اردو";
  const rtlText = isRTL
    ? { writingDirection: "rtl" as const, textAlign: "right" as const }
    : null;

  async function continueNext() {
    const data: OnboardingData = {
      name: name.trim() || "Learner",
      language,
      grade,
    };
    await saveJSON(ONBOARD_KEY, data);
    router.replace("/tabs/home");
  }

  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      {/* Centered container (tablet fix) */}
      <View style={styles.container}>
        {/* Hero */}
        <LinearGradient
          colors={["#7C3AED", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>Welcome to OffKlass</Text>
          <Text style={styles.heroSub}>Let’s set up your profile</Text>
        </LinearGradient>

        {/* Name */}
        <View style={[styles.tile, styles.tileBlue]}>
          <View style={styles.tileHeader}>
            <View style={[styles.tileIcon, { backgroundColor: "#1E3A8A" }]}>
              <Ionicons name="person-outline" size={18} color="#CFE4FF" />
            </View>
            <Text style={[styles.tileBadge, rtlText]}>{L.nameBadge}</Text>
          </View>

          <Text style={[styles.tileTitle, rtlText]}>{L.whoAreYou}</Text>

          <TextInput
            placeholder={L.enterName}
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            style={[
              styles.inputFancy,
              nameFocused && styles.inputFocused,
              rtlText,
            ]}
          />
        </View>

        {/* Language */}
        <View style={[styles.tile, styles.tileGreen]}>
          <View style={styles.tileHeader}>
            <View style={[styles.tileIcon, { backgroundColor: "#065F46" }]}>
              <Ionicons name="language-outline" size={18} color="#CFFAFE" />
            </View>
            <Text style={[styles.tileBadge, rtlText]}>{L.langBadge}</Text>
          </View>

          <Text style={[styles.tileTitle, rtlText]}>{L.chooseLang}</Text>

          <View style={styles.rowWrap}>
            {LANGS.map((l) => (
              <Chip
                key={l}
                label={l}
                active={l === language}
                onPress={() => setLanguage(l)}
              />
            ))}
          </View>
        </View>

        {/* Grade */}
        <View style={[styles.tile, styles.tileOrange]}>
          <View style={styles.tileHeader}>
            <View style={[styles.tileIcon, { backgroundColor: "#7C2D12" }]}>
              <Ionicons name="school-outline" size={18} color="#FFE7D1" />
            </View>
            <Text style={[styles.tileBadge, rtlText]}>{L.gradeBadge}</Text>
          </View>

          <Text style={[styles.tileTitle, rtlText]}>{L.whichGrade}</Text>

          <View style={styles.rowWrap}>
            {GRADES.map((g) => (
              <Chip
                key={g}
                label={g}
                active={g === grade}
                onPress={() => setGrade(g)}
              />
            ))}
          </View>
        </View>

        {/* Continue */}
        <Pressable onPress={continueNext}>
          <LinearGradient
            colors={["#A78BFA", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Ionicons
              name="arrow-forward-circle-outline"
              size={20}
              color="#fff"
            />
            <Text style={styles.ctaText}>{L.continue}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ---------- styles ---------- */

const cardShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#0E0D1B",
    paddingVertical: 16,
  },

  container: {
    width: "100%",
    maxWidth: 640, // tablet sweet spot
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  hero: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 24,
  },
  heroSub: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },

  tile: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    ...cardShadow,
  },
  tileBlue: { backgroundColor: "#0B1730", borderColor: "#294480" },
  tileGreen: { backgroundColor: "#0B1F1C", borderColor: "#155E57" },
  tileOrange: { backgroundColor: "#2B1406", borderColor: "#8A4C1B" },

  tileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    borderWidth: 1,
    borderColor: "#FFFFFF20",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tileTitle: {
    color: "#F1F5F9",
    fontWeight: "900",
    fontSize: 16,
    marginVertical: 10,
  },

  inputFancy: {
    borderWidth: 1.5,
    borderColor: "#334155",
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: "#F1F5F9",
    backgroundColor: "#0B1220",
  },
  inputFocused: {
    borderColor: "#60A5FA",
    backgroundColor: "#0F172A",
  },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  cta: {
    marginTop: 24,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});
