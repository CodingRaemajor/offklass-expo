import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { saveJSON, ONBOARD_KEY, type OnboardingData } from "../lib/storage";
import { router } from "expo-router";

/* ------------------------------- constants ------------------------------- */

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
] as const;

const SCHOOLS = [
  "Regina Public Schools - Regina, Saskatchewan, Canada",
  "Regina Catholic Schools - Regina, Saskatchewan, Canada",
  "Prairie Valley School Division - Saskatchewan, Canada",
  "Saskatoon Public Schools - Saskatchewan, Canada",
  "Other / Not Listed",
] as const;

/* ------------------------------ lightweight i18n ------------------------------ */

const translations: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    leftTagline: string;
    cards: { title: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[];
    formTitle: string;
    formSub: string;
    nameLabel: string;
    schoolLabel: string;
    gradeLabel: string;
    gradeHint: string;
    langLabel: string;
    namePlaceholder: string;
    pickSchool: string;
    pickGrade: string;
    pickLang: string;
    continue: string;
    required: string;
    errName: string;
    errGrade: string;
    errLang: string;
    errSchool: string;
  }
> = {
  English: {
    title: "Welcome to",
    subtitle: "Offklass",
    leftTagline: "Interactive, AI-powered math education for grades 3-8",
    cards: [
      { title: "Step-by-Step", desc: "Learn at your own pace", icon: "book-outline" },
      { title: "AI Powered", desc: "Smart explanations", icon: "sparkles-outline" },
      { title: "Earn Points", desc: "Level up as you learn", icon: "trophy-outline" },
      { title: "Multi-Language", desc: "Learn in your language", icon: "people-outline" },
    ],
    formTitle: "Get Started",
    formSub: "Enter your details and pick your grade to start learning.",
    nameLabel: "Name",
    schoolLabel: "School",
    gradeLabel: "Grade",
    gradeHint: "Choose your math level",
    langLabel: "Language",
    namePlaceholder: "Your name",
    pickSchool: "Select your school",
    pickGrade: "Select your grade (3-11)",
    pickLang: "Select language",
    continue: "Continue",
    required: "Required",
    errName: "Please enter your name.",
    errGrade: "Please select your grade.",
    errLang: "Please select your language.",
    errSchool: "Please select your school.",
  },
  नेपाली: {
    title: "स्वागत छ",
    subtitle: "Offklass",
    leftTagline: "कक्षा ३–८ का लागि एआई-सहायता गणित सिकाइ",
    cards: [
      { title: "क्रमिक सिकाइ", desc: "आफ्नै गतिमा सिक्नुहोस्", icon: "book-outline" },
      { title: "एआई सहयोग", desc: "स्मार्ट व्याख्या", icon: "sparkles-outline" },
      { title: "अंक कमाउनुहोस्", desc: "सिक्दै गर्दा लेभल बढाउनुहोस्", icon: "trophy-outline" },
      { title: "बहुभाषी", desc: "आफ्नो भाषामा सिक्नुहोस्", icon: "people-outline" },
    ],
    formTitle: "सुरु गरौँ",
    formSub: "तपाईंको विवरण भर्नुहोस् र कक्षा छान्नुहोस्।",
    nameLabel: "नाम",
    schoolLabel: "विद्यालय",
    gradeLabel: "कक्षा",
    gradeHint: "गणित स्तर छान्नुहोस्",
    langLabel: "भाषा",
    namePlaceholder: "तपाईंको नाम",
    pickSchool: "विद्यालय छान्नुहोस्",
    pickGrade: "कक्षा छान्नुहोस् (३-११)",
    pickLang: "भाषा छान्नुहोस्",
    continue: "जारी राख्नुहोस्",
    required: "आवश्यक",
    errName: "कृपया नाम लेख्नुहोस्।",
    errGrade: "कृपया कक्षा छान्नुहोस्।",
    errLang: "कृपया भाषा छान्नुहोस्।",
    errSchool: "कृपया विद्यालय छान्नुहोस्।",
  },
  اردو: {
    title: "خوش آمدید",
    subtitle: "Offklass",
    leftTagline: "جماعت ۳–۸ کے لیے اے آئی سے مدد یافتہ ریاضی",
    cards: [
      { title: "مرحلہ وار", desc: "اپنی رفتار سے سیکھیں", icon: "book-outline" },
      { title: "اے آئی پاورڈ", desc: "سمارٹ وضاحتیں", icon: "sparkles-outline" },
      { title: "پوائنٹس کمائیں", desc: "سیکھتے ہوئے لیول بڑھائیں", icon: "trophy-outline" },
      { title: "کئی زبانیں", desc: "اپنی زبان میں سیکھیں", icon: "people-outline" },
    ],
    formTitle: "شروع کریں",
    formSub: "تفصیلات درج کریں اور اپنی جماعت منتخب کریں۔",
    nameLabel: "نام",
    schoolLabel: "اسکول",
    gradeLabel: "جماعت",
    gradeHint: "اپنا لیول منتخب کریں",
    langLabel: "زبان",
    namePlaceholder: "آپ کا نام",
    pickSchool: "اسکول منتخب کریں",
    pickGrade: "جماعت منتخب کریں (۳-۱۱)",
    pickLang: "زبان منتخب کریں",
    continue: "جاری رکھیں",
    required: "ضروری",
    errName: "براہِ کرم نام درج کریں۔",
    errGrade: "براہِ کرم جماعت منتخب کریں۔",
    errLang: "براہِ کرم زبان منتخب کریں۔",
    errSchool: "براہِ کرم اسکول منتخب کریں۔",
  },
  বাংলা: {
    title: "স্বাগতম",
    subtitle: "Offklass",
    leftTagline: "শ্রেণি ৩–৮ এর জন্য এআই-সাপোর্টেড গণিত শেখা",
    cards: [
      { title: "ধাপে ধাপে", desc: "নিজের গতিতে শিখুন", icon: "book-outline" },
      { title: "এআই পাওয়ার্ড", desc: "স্মার্ট ব্যাখ্যা", icon: "sparkles-outline" },
      { title: "পয়েন্ট অর্জন", desc: "শিখতে শিখতে লেভেল আপ", icon: "trophy-outline" },
      { title: "বহুভাষা", desc: "নিজের ভাষায় শিখুন", icon: "people-outline" },
    ],
    formTitle: "শুরু করুন",
    formSub: "তথ্য দিন এবং শ্রেণি নির্বাচন করুন।",
    nameLabel: "নাম",
    schoolLabel: "স্কুল",
    gradeLabel: "শ্রেণি",
    gradeHint: "গণিত লেভেল নির্বাচন করুন",
    langLabel: "ভাষা",
    namePlaceholder: "আপনার নাম",
    pickSchool: "স্কুল নির্বাচন করুন",
    pickGrade: "শ্রেণি নির্বাচন করুন (৩-১১)",
    pickLang: "ভাষা নির্বাচন করুন",
    continue: "চালিয়ে যান",
    required: "প্রয়োজনীয়",
    errName: "অনুগ্রহ করে নাম লিখুন।",
    errGrade: "অনুগ্রহ করে শ্রেণি নির্বাচন করুন।",
    errLang: "অনুগ্রহ করে ভাষা নির্বাচন করুন।",
    errSchool: "অনুগ্রহ করে স্কুল নির্বাচন করুন।",
  },
  हिन्दी: {
    title: "Welcome to",
    subtitle: "Offklass",
    leftTagline: "Grades 3–8 के लिए AI-powered Math learning",
    cards: [
      { title: "Step-by-Step", desc: "अपनी गति से सीखें", icon: "book-outline" },
      { title: "AI Powered", desc: "Smart explanations", icon: "sparkles-outline" },
      { title: "Earn Points", desc: "सीखते हुए level up", icon: "trophy-outline" },
      { title: "Multi-Language", desc: "अपनी भाषा में सीखें", icon: "people-outline" },
    ],
    formTitle: "Get Started",
    formSub: "अपनी जानकारी भरें और grade चुनें।",
    nameLabel: "Name",
    schoolLabel: "School",
    gradeLabel: "Grade",
    gradeHint: "Math level चुनें",
    langLabel: "Language",
    namePlaceholder: "Your name",
    pickSchool: "School चुनें",
    pickGrade: "Grade चुनें (3-11)",
    pickLang: "Language चुनें",
    continue: "Continue",
    required: "Required",
    errName: "Please अपना नाम लिखें।",
    errGrade: "Please grade चुनें।",
    errLang: "Please language चुनें।",
    errSchool: "Please school चुनें।",
  },
};

export default function Onboarding() {
  const { width } = Dimensions.get("window");
  const isTablet = width >= 900;

  const [language, setLanguage] = useState<Lang>("English");
  const T = useMemo(() => translations[language], [language]);

  const isRTL = language === "اردو";
  const rtl = isRTL ? ({ writingDirection: "rtl" as const, textAlign: "right" as const } as const) : undefined;

  const [name, setName] = useState("");
  const [school, setSchool] = useState<(typeof SCHOOLS)[number]>(SCHOOLS[0]);
  const [grade, setGrade] = useState<(typeof GRADES)[number]>(GRADES[1]); // default Grade 4
  const [lang, setLang] = useState<Lang>(language);

  // keep language in sync
  React.useEffect(() => setLang(language), [language]);

  const [err, setErr] = useState<string | null>(null);

  // modal select
  const [selectOpen, setSelectOpen] = useState<null | { title: string; items: string[]; value: string; onPick: (v: string) => void }>(
    null
  );

  const openSelect = (title: string, items: string[], value: string, onPick: (v: string) => void) => {
    setSelectOpen({ title, items, value, onPick });
  };

  const validate = () => {
    if (!name.trim()) return T.errName;
    if (!school) return T.errSchool;
    if (!grade) return T.errGrade;
    if (!lang) return T.errLang;
    return null;
  };

  const continueNext = async () => {
    const e = validate();
    if (e) {
      setErr(e);
      return;
    }
    setErr(null);

    const data: OnboardingData = {
      name: name.trim(),
      school,
      grade,
      language: lang,
    };

    await saveJSON(ONBOARD_KEY, data);
    router.replace("/tabs/home");
  };

  return (
    <LinearGradient colors={["#2F6BFF", "#3A3FDB", "#2B3AAE"]} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingHorizontal: isTablet ? 28 : 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.shell, isTablet ? styles.shellRow : styles.shellCol]}>
            {/* LEFT panel */}
            <View style={[styles.left, isTablet ? styles.leftTablet : styles.leftPhone]}>
              <View style={styles.logoCircle}>
                <Ionicons name="layers-outline" size={34} color="#fff" />
              </View>

              <Text style={[styles.bigTitle, rtl]}>
                {T.title}{" "}
                <Text style={styles.brand}>{T.subtitle}</Text>
              </Text>

              <Text style={[styles.tagline, rtl]}>{T.leftTagline}</Text>

              <View style={[styles.featureGrid, isTablet ? styles.featureGridTablet : styles.featureGridPhone]}>
                {T.cards.map((c) => (
                  <View key={c.title} style={styles.featureCard}>
                    <Ionicons name={c.icon} size={22} color="#fff" />
                    <Text style={styles.featureTitle}>{c.title}</Text>
                    <Text style={styles.featureDesc}>{c.desc}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* RIGHT panel (form) */}
            <View style={[styles.right, isTablet ? styles.rightTablet : styles.rightPhone]}>
              <View style={styles.formCard}>
                <Text style={[styles.formTitle, rtl]}>{T.formTitle}</Text>
                <Text style={[styles.formSub, rtl]}>{T.formSub}</Text>

                {/* Name */}
                <LabelRow label={T.nameLabel} required={T.required} rtl={rtl} />
                <TextInput
                  value={name}
                  onChangeText={(t) => setName(t)}
                  placeholder={T.namePlaceholder}
                  placeholderTextColor="#A1A1AA"
                  style={[styles.input, rtl]}
                />

                {/* School */}
                <LabelRow label={T.schoolLabel} required={T.required} rtl={rtl} />
                <SelectBox
                  value={school}
                  onPress={() => openSelect(T.schoolLabel, [...SCHOOLS], school, (v) => setSchool(v as any))}
                  rtl={rtl}
                  icon="school-outline"
                />

                {/* Grade */}
                <View style={{ marginTop: 14 }}>
                  <View style={styles.labelLine}>
                    <View style={styles.labelLeft}>
                      <Ionicons name="grid-outline" size={16} color="#111827" />
                      <Text style={[styles.label, rtl]}>{T.gradeLabel} *</Text>
                      <Text style={styles.muted}>({T.required})</Text>
                    </View>
                    <Text style={styles.muted}>{T.gradeHint}</Text>
                  </View>

                  <SelectBox
                    value={grade}
                    onPress={() => openSelect(T.gradeLabel, [...GRADES], grade, (v) => setGrade(v as any))}
                    rtl={rtl}
                    icon="layers-outline"
                  />
                </View>

                {/* Language */}
                <LabelRow label={T.langLabel} required={T.required} rtl={rtl} />
                <SelectBox
                  value={lang}
                  onPress={() => openSelect(T.langLabel, [...LANGS], lang, (v) => setLanguage(v as any))}
                  rtl={rtl}
                  icon="language-outline"
                />

                {!!err && (
                  <View style={styles.errRow}>
                    <Ionicons name="warning-outline" size={16} color="#DC2626" />
                    <Text style={styles.errText}>{err}</Text>
                  </View>
                )}

                <Pressable onPress={continueNext} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
                  <LinearGradient colors={["#2563EB", "#06B6D4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtnInner}>
                    <Text style={styles.primaryText}>{T.continue}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Select Modal */}
        <Modal visible={!!selectOpen} transparent animationType="fade" onRequestClose={() => setSelectOpen(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectOpen(null)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>{selectOpen?.title}</Text>
              <FlatList
                data={selectOpen?.items ?? []}
                keyExtractor={(item) => item}
                style={{ maxHeight: 420 }}
                renderItem={({ item }) => {
                  const active = item === selectOpen?.value;
                  return (
                    <Pressable
                      onPress={() => {
                        selectOpen?.onPick(item);
                        setSelectOpen(null);
                      }}
                      style={[styles.modalItem, active && styles.modalItemActive]}
                    >
                      <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>{item}</Text>
                      {active && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function LabelRow({ label, required, rtl }: { label: string; required: string; rtl?: any }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, rtl]}>
        {label} <Text style={styles.req}>*</Text>
      </Text>
      <Text style={styles.muted}>({required})</Text>
    </View>
  );
}

function SelectBox({
  value,
  onPress,
  rtl,
  icon,
}: {
  value: string;
  onPress: () => void;
  rtl?: any;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.select, pressed && { transform: [{ scale: 0.995 }] }]}>
      <View style={styles.selectLeft}>
        <Ionicons name={icon} size={18} color="#111827" />
        <Text style={[styles.selectText, rtl]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={18} color="#111827" />
    </Pressable>
  );
}

/* -------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { paddingVertical: 22, flexGrow: 1 },
  shell: { width: "100%", maxWidth: 1200, alignSelf: "center", gap: 18 },

  shellRow: { flexDirection: "row", alignItems: "stretch" },
  shellCol: { flexDirection: "column" },

  left: { flex: 1, padding: 14, justifyContent: "center" },
  leftTablet: { paddingRight: 26 },
  leftPhone: { paddingBottom: 6 },

  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  bigTitle: { color: "#fff", fontSize: 46, fontWeight: "900", lineHeight: 54 },
  brand: { color: "#FFD54A" },
  tagline: { marginTop: 14, color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: "700" },

  featureGrid: { marginTop: 20, gap: 14 },
  featureGridTablet: { flexDirection: "row", flexWrap: "wrap" },
  featureGridPhone: { flexDirection: "row", flexWrap: "wrap" },

  featureCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  featureTitle: { marginTop: 8, color: "#fff", fontWeight: "900", fontSize: 15 },
  featureDesc: { marginTop: 2, color: "rgba(255,255,255,0.85)", fontWeight: "700" },

  right: { flex: 1, alignItems: "center", justifyContent: "center" },
  rightTablet: { alignItems: "flex-end" },
  rightPhone: { alignItems: "center" },

  formCard: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  formTitle: { fontSize: 30, fontWeight: "900", color: "#111827" },
  formSub: { marginTop: 6, marginBottom: 14, color: "rgba(17,24,39,0.72)", fontWeight: "700" },

  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
  labelLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  labelLeft: { flexDirection: "row", alignItems: "center", gap: 6 },

  label: { color: "#111827", fontWeight: "900" },
  muted: { color: "rgba(17,24,39,0.62)", fontWeight: "700" },
  req: { color: "#DC2626" },

  input: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(37,99,235,0.35)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },

  select: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(37,99,235,0.35)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  selectText: { color: "#111827", fontWeight: "800", flex: 1 },

  errRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  errText: { color: "#DC2626", fontWeight: "800" },

  primaryBtn: { marginTop: 16, borderRadius: 14, overflow: "hidden" },
  primaryBtnInner: { paddingVertical: 14, alignItems: "center", borderRadius: 14 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827", marginBottom: 10 },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalItemActive: { backgroundColor: "rgba(37,99,235,0.08)" },
  modalItemText: { color: "#111827", fontWeight: "800" },
  modalItemTextActive: { color: "#2563EB" },
  sep: { height: 8 },
});
