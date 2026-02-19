// app/onboarding.tsx
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
    formTitle: string;
    formSub: string;
    nameLabel: string;
    schoolLabel: string;
    gradeLabel: string;
    langLabel: string;
    namePlaceholder: string;
    continue: string;
    required: string;
    errName: string;
    errGrade: string;
    errLang: string;
    errSchool: string;
    note: string;
    highlight: string;
    requiredWord: string;
  }
> = {
  English: {
    title: "Welcome to",
    subtitle: "Offklass",
    leftTagline: "Interactive, AI-powered math education for grades 3-11",
    formTitle: "Get Started",
    formSub: "Enter your details to begin learning.",
    nameLabel: "Name",
    schoolLabel: "School",
    gradeLabel: "Grade",
    langLabel: "Language",
    namePlaceholder: "Your name",
    continue: "Continue",
    required: "Required",
    errName: "Please enter your name.",
    errGrade: "Please select your grade.",
    errLang: "Please select your language.",
    errSchool: "Please select your school.",
    note: "By continuing you agree to our classroom-friendly learning experience.",
    highlight: "Grades 3–11 • Offline-first • Built for classrooms",
    requiredWord: "Required",
  },
  नेपाली: {
    title: "स्वागत छ",
    subtitle: "Offklass",
    leftTagline: "कक्षा ३–११ का लागि एआई-सहायता गणित सिकाइ",
    formTitle: "सुरु गरौँ",
    formSub: "सुरु गर्न विवरण भर्नुहोस्।",
    nameLabel: "नाम",
    schoolLabel: "विद्यालय",
    gradeLabel: "कक्षा",
    langLabel: "भाषा",
    namePlaceholder: "तपाईंको नाम",
    continue: "जारी राख्नुहोस्",
    required: "आवश्यक",
    errName: "कृपया नाम लेख्नुहोस्।",
    errGrade: "कृपया कक्षा छान्नुहोस्।",
    errLang: "कृपया भाषा छान्नुहोस्।",
    errSchool: "कृपया विद्यालय छान्नुहोस्।",
    note: "जारी राख्दा तपाईं कक्षा-मैत्री सिकाइ अनुभवसँग सहमत हुनुहुन्छ।",
    highlight: "कक्षा ३–११ • अफलाइन • कक्षाकोठाका लागि",
    requiredWord: "आवश्यक",
  },
  اردو: {
    title: "خوش آمدید",
    subtitle: "Offklass",
    leftTagline: "جماعت ۳–۱۱ کے لیے اے آئی سے مدد یافتہ ریاضی",
    formTitle: "شروع کریں",
    formSub: "سیکھنا شروع کرنے کے لیے تفصیلات درج کریں۔",
    nameLabel: "نام",
    schoolLabel: "اسکول",
    gradeLabel: "جماعت",
    langLabel: "زبان",
    namePlaceholder: "آپ کا نام",
    continue: "جاری رکھیں",
    required: "ضروری",
    errName: "براہِ کرم نام درج کریں۔",
    errGrade: "براہِ کرم جماعت منتخب کریں۔",
    errLang: "براہِ کرم زبان منتخب کریں۔",
    errSchool: "براہِ کرم اسکول منتخب کریں۔",
    note: "جاری رکھ کر آپ ہمارے کلاس روم فرینڈلی تجربے سے متفق ہیں۔",
    highlight: "جماعت ۳–۱۱ • آف لائن • کلاس روم کے لیے",
    requiredWord: "ضروری",
  },
  বাংলা: {
    title: "স্বাগতম",
    subtitle: "Offklass",
    leftTagline: "শ্রেণি ৩–১১ এর জন্য এআই-সাপোর্টেড গণিত শেখা",
    formTitle: "শুরু করুন",
    formSub: "শুরু করতে তথ্য দিন।",
    nameLabel: "নাম",
    schoolLabel: "স্কুল",
    gradeLabel: "শ্রেণি",
    langLabel: "ভাষা",
    namePlaceholder: "আপনার নাম",
    continue: "চালিয়ে যান",
    required: "প্রয়োজনীয়",
    errName: "অনুগ্রহ করে নাম লিখুন।",
    errGrade: "অনুগ্রহ করে শ্রেণি নির্বাচন করুন।",
    errLang: "অনুগ্রহ করে ভাষা নির্বাচন করুন।",
    errSchool: "অনুগ্রহ করে স্কুল নির্বাচন করুন।",
    note: "চালিয়ে গেলে আপনি আমাদের শ্রেণিকক্ষ-বান্ধব অভিজ্ঞতায় সম্মত হন।",
    highlight: "শ্রেণি ৩–১১ • অফলাইন • শ্রেণিকক্ষের জন্য",
    requiredWord: "প্রয়োজনীয়",
  },
  हिन्दी: {
    title: "Welcome to",
    subtitle: "Offklass",
    leftTagline: "Grades 3–11 के लिए AI-powered Math learning",
    formTitle: "Get Started",
    formSub: "Start करने के लिए details भरें।",
    nameLabel: "Name",
    schoolLabel: "School",
    gradeLabel: "Grade",
    langLabel: "Language",
    namePlaceholder: "Your name",
    continue: "Continue",
    required: "Required",
    errName: "Please अपना नाम लिखें।",
    errGrade: "Please grade चुनें।",
    errLang: "Please language चुनें।",
    errSchool: "Please school चुनें।",
    note: "Continue करने पर आप classroom-friendly experience से agree करते हैं।",
    highlight: "Grades 3–11 • Offline-first • Built for classrooms",
    requiredWord: "Required",
  },
};

export default function Onboarding() {
  const { width } = Dimensions.get("window");
  const isTablet = width >= 900;

  const [language, setLanguage] = useState<Lang>("English");
  const T = useMemo(() => translations[language], [language]);

  const isRTL = language === "اردو";
  const rtl = isRTL
    ? ({ writingDirection: "rtl" as const, textAlign: "right" as const } as const)
    : undefined;

  const [name, setName] = useState("");
  const [school, setSchool] = useState<(typeof SCHOOLS)[number]>(SCHOOLS[0]);
  const [grade, setGrade] = useState<(typeof GRADES)[number]>(GRADES[1]);
  const [lang, setLang] = useState<Lang>(language);

  React.useEffect(() => setLang(language), [language]);

  const [err, setErr] = useState<string | null>(null);

  const [selectOpen, setSelectOpen] = useState<null | {
    title: string;
    items: string[];
    value: string;
    onPick: (v: string) => void;
  }>(null);

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
    <LinearGradient colors={["#0A4DFF", "#2F6BFF", "#5FB6FF"]} style={styles.bg}>
      {/* soft glow */}
      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingHorizontal: isTablet ? 34 : 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.shell, isTablet ? styles.shellRow : styles.shellCol]}>
            {/* LEFT */}
            <View style={[styles.left, isTablet ? styles.leftTablet : styles.leftPhone]}>
              <Text style={[styles.bigTitle, rtl]}>
                {T.title} <Text style={styles.brand}>{T.subtitle}</Text>
              </Text>

              <Text style={[styles.tagline, rtl]}>{T.leftTagline}</Text>

              <View style={styles.highlightPill}>
                <Ionicons name="sparkles-outline" size={16} color="rgba(255,255,255,0.92)" />
                <Text style={[styles.highlightText, rtl]}>{T.highlight}</Text>
              </View>
            </View>

            {/* RIGHT (form) */}
            <View style={[styles.right, isTablet ? styles.rightTablet : styles.rightPhone]}>
              {/* IMPORTANT: removed the extra transparent BLUE overlay look by making the card WHITE */}
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <View style={styles.formHeaderIcon}>
                    <Ionicons name="rocket-outline" size={20} color="#0A4DFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formTitle, rtl]}>{T.formTitle}</Text>
                    <Text style={[styles.formSub, rtl]}>{T.formSub}</Text>
                  </View>
                </View>

                {/* Name */}
                <FieldLabel label={T.nameLabel} requiredWord={T.requiredWord} rtl={rtl} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={T.namePlaceholder}
                  placeholderTextColor="rgba(17,24,39,0.45)"
                  style={[styles.input, rtl]}
                />

                {/* School */}
                <FieldLabel label={T.schoolLabel} requiredWord={T.requiredWord} rtl={rtl} />
                <SelectBox
                  value={school}
                  onPress={() => openSelect(T.schoolLabel, [...SCHOOLS], school, (v) => setSchool(v as any))}
                  rtl={rtl}
                  icon="school-outline"
                />

                {/* Grade */}
                <FieldLabel label={T.gradeLabel} requiredWord={T.requiredWord} rtl={rtl} />
                <SelectBox
                  value={grade}
                  onPress={() => openSelect(T.gradeLabel, [...GRADES], grade, (v) => setGrade(v as any))}
                  rtl={rtl}
                  icon="grid-outline"
                />

                {/* Language */}
                <FieldLabel label={T.langLabel} requiredWord={T.requiredWord} rtl={rtl} />
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

                <Pressable onPress={continueNext} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.93 }]}>
                  <LinearGradient colors={["#0A4DFF", "#2F6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtnInner}>
                    <Text style={styles.primaryText}>{T.continue}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </Pressable>

                <Text style={[styles.smallNote, rtl]}>{T.note}</Text>
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
                style={{ maxHeight: 520 }}
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
                      {active && <Ionicons name="checkmark" size={18} color="#0A4DFF" />}
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

function FieldLabel({ label, requiredWord, rtl }: { label: string; requiredWord: string; rtl?: any }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, rtl]}>
        {label} <Text style={styles.req}>*</Text>
      </Text>
      <Text style={styles.muted}>({requiredWord})</Text>
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
    <Pressable onPress={onPress} style={({ pressed }) => [styles.select, pressed && { transform: [{ scale: 0.995 }], opacity: 0.98 }]}>
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

  glowA: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  glowB: {
    position: "absolute",
    bottom: -160,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 420,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  scroll: { paddingVertical: 26, flexGrow: 1 },
  shell: { width: "100%", maxWidth: 1250, alignSelf: "center", gap: 18 },

  shellRow: { flexDirection: "row", alignItems: "stretch" },
  shellCol: { flexDirection: "column" },

  left: { flex: 1, padding: 10, justifyContent: "center" },
  leftTablet: { paddingRight: 26 },
  leftPhone: { paddingBottom: 8 },

  bigTitle: { color: "#fff", fontSize: 52, fontWeight: "900", lineHeight: 60 },
  brand: { color: "rgba(255,255,255,0.92)" },
  tagline: { marginTop: 10, color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: "800" },

  highlightPill: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  highlightText: { color: "rgba(255,255,255,0.92)", fontWeight: "900" },

  right: { flex: 1, alignItems: "center", justifyContent: "center" },
  rightTablet: { alignItems: "flex-end" },
  rightPhone: { alignItems: "center" },

  /* KEY CHANGE: make the card solid white (no blue tint) */
  formCard: {
    width: "100%",
    maxWidth: 660,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.40)",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  formHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  formHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(10,77,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(10,77,255,0.14)",
  },

  formTitle: { fontSize: 34, fontWeight: "900", color: "#0B1220" },
  formSub: { marginTop: 2, color: "rgba(11,18,32,0.66)", fontWeight: "800" },

  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 8 },
  label: { color: "#111827", fontWeight: "900" },
  muted: { color: "rgba(17,24,39,0.60)", fontWeight: "800" },
  req: { color: "#DC2626" },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(10,77,255,0.18)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#111827",
  },

  select: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(10,77,255,0.18)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  selectText: { color: "#111827", fontWeight: "900", flex: 1 },

  errRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  errText: { color: "#DC2626", fontWeight: "900" },

  primaryBtn: { marginTop: 18, borderRadius: 16, overflow: "hidden" },
  primaryBtnInner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderRadius: 16,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },

  smallNote: { marginTop: 12, color: "rgba(11,18,32,0.62)", fontWeight: "800" },

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
  modalItemActive: { backgroundColor: "rgba(10,77,255,0.08)" },
  modalItemText: { color: "#111827", fontWeight: "900" },
  modalItemTextActive: { color: "#0A4DFF" },
  sep: { height: 8 },
});
