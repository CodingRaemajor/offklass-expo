// app/(tabs)/profile.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, DevSettings } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";

/* ----------------------------- Lightweight i18n ---------------------------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    profile: string;
    clear: string;
    clearTitle: string;
    clearMsg: string;
    cancel: string;
    done: string;
    cleared: string;
    error: string;
    cannotClear: string;

    learningTitle: string;
    subject: string;
    grade: string;
    school: string;

    tipsTitle: string;
    tip1: string;
    tip2: string;
    tip3: string;

    notSelected: string;
  }
> = {
  English: {
    profile: "Profile",
    clear: "Clear",
    clearTitle: "Clear cache?",
    clearMsg: "This will reset saved data (grade, school, language, chats, etc.).",
    cancel: "Cancel",
    done: "Done",
    cleared: "App data cleared.",
    error: "Error",
    cannotClear: "Could not clear cache.",

    learningTitle: "My Learning",
    subject: "Subject",
    grade: "Grade",
    school: "School",

    tipsTitle: "Today’s Teacher Tips",
    tip1: "Ask for steps and a quick check.",
    tip2: "Mark “Needs Practice” when unsure.",
    tip3: "Try one similar example after you learn.",

    notSelected: "Not selected",
  },
  नेपाली: {
    profile: "प्रोफाइल",
    clear: "हटाउनुहोस्",
    clearTitle: "क्यास हटाउने?",
    clearMsg: "यसले सुरक्षित डेटा (कक्षा, विद्यालय, भाषा, च्याट, आदि) रिसेट गर्छ।",
    cancel: "रद्द",
    done: "भयो",
    cleared: "एप डेटा हटाइयो।",
    error: "त्रुटि",
    cannotClear: "क्यास हटाउन सकिएन।",

    learningTitle: "मेरो सिकाइ",
    subject: "विषय",
    grade: "कक्षा",
    school: "विद्यालय",

    tipsTitle: "आजका शिक्षक टिप्स",
    tip1: "कदम र छिटो जाँच माग्नुहोस्।",
    tip2: "नबुझे ‘अभ्यास चाहियो’ छान्नुहोस्।",
    tip3: "एउटा मिल्दोजुल्दो उदाहरण पनि गरौँ।",

    notSelected: "छानिएको छैन",
  },
  اردو: {
    profile: "پروفائل",
    clear: "صاف کریں",
    clearTitle: "کیش صاف کریں؟",
    clearMsg: "یہ محفوظ ڈیٹا (جماعت، اسکول، زبان، چیٹس وغیرہ) ری سیٹ کرے گا۔",
    cancel: "منسوخ",
    done: "ہو گیا",
    cleared: "ایپ ڈیٹا صاف ہو گیا۔",
    error: "خرابی",
    cannotClear: "کیش صاف نہیں ہو سکا۔",

    learningTitle: "میری پڑھائی",
    subject: "مضمون",
    grade: "جماعت",
    school: "اسکول",

    tipsTitle: "آج کے ٹیچر ٹپس",
    tip1: "مرحلہ وار حل اور آخر میں چیک مانگیں۔",
    tip2: "اگر شک ہو تو ‘مزید مشق’ کریں۔",
    tip3: "ایک ملتا جلتا سوال بھی حل کریں۔",

    notSelected: "منتخب نہیں",
  },
  বাংলা: {
    profile: "প্রোফাইল",
    clear: "ক্লিয়ার",
    clearTitle: "ক্যাশ ক্লিয়ার করবেন?",
    clearMsg: "এতে সেভ করা ডাটা (গ্রেড, স্কুল, ভাষা, চ্যাট ইত্যাদি) রিসেট হবে।",
    cancel: "বাতিল",
    done: "হয়ে গেছে",
    cleared: "অ্যাপ ডাটা ক্লিয়ার হয়েছে।",
    error: "ত্রুটি",
    cannotClear: "ক্যাশ ক্লিয়ার করা যায়নি।",

    learningTitle: "আমার শেখা",
    subject: "বিষয়",
    grade: "গ্রেড",
    school: "স্কুল",

    tipsTitle: "আজকের শিক্ষক টিপস",
    tip1: "ধাপে ধাপে সমাধান আর দ্রুত চেক চাইতে বলো।",
    tip2: "নিশ্চিত না হলে ‘আরো অনুশীলন’ দাও।",
    tip3: "একটা মিল প্রশ্নও করে নাও।",

    notSelected: "নির্বাচিত নয়",
  },
  हिन्दी: {
    profile: "प्रोफ़ाइल",
    clear: "क्लियर",
    clearTitle: "कैश क्लियर करें?",
    clearMsg: "इससे सेव डेटा (कक्षा, स्कूल, भाषा, चैट आदि) रीसेट हो जाएगा।",
    cancel: "कैंसिल",
    done: "Done",
    cleared: "App data cleared.",
    error: "Error",
    cannotClear: "Could not clear cache.",

    learningTitle: "मेरी Learning",
    subject: "Subject",
    grade: "Grade",
    school: "School",

    tipsTitle: "Today’s Teacher Tips",
    tip1: "Steps और quick check मांगो।",
    tip2: "Doubt हो तो ‘Needs Practice’ करो।",
    tip3: "Similar example भी कर लो।",

    notSelected: "Not selected",
  },
};

/* --------------------------------- Screen --------------------------------- */

export default function Profile() {
  const [user, setUser] = useState<OnboardingData | null>(null);
  const insets = useSafeAreaInsets();

  const loadUser = useCallback(async () => {
    const u = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
    setUser(u);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
      return () => {};
    }, [loadUser])
  );

  const lang: Lang = (user?.language as Lang) || "English";
  const T = useMemo(() => L10N[lang], [lang]);

  const isRTL = lang === "اردو";
  const rtl = isRTL ? ({ writingDirection: "rtl" as "rtl", textAlign: "right" as const } as const) : undefined;

  const initials = (user?.name?.trim?.() || "Learner")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const subject = "Maths";
  const grade = user?.grade ? String(user.grade) : T.notSelected;

  const school =
    (user as any)?.schoolName ||
    (user as any)?.school ||
    (user as any)?.school_name ||
    (user as any)?.selectedSchool ||
    "";

  const badge =
    grade === T.notSelected
      ? "Explorer"
      : Number(String(user?.grade || 0)) <= 2
      ? "Tiny Star"
      : Number(String(user?.grade || 0)) <= 4
      ? "Super Learner"
      : Number(String(user?.grade || 0)) <= 6
      ? "Math Hero"
      : "Champion";

  async function hardReloadApp() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Updates = require("expo-updates");
      if (Updates?.reloadAsync) {
        await Updates.reloadAsync();
        return;
      }
    } catch {}
    try {
      DevSettings.reload();
    } catch {}
  }

  async function onClearCache() {
    Alert.alert(T.clearTitle, T.clearMsg, [
      { text: T.cancel, style: "cancel" },
      {
        text: T.clear,
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            setUser(null);

            Alert.alert(T.done, T.cleared, [
              {
                text: "OK",
                onPress: () => {
                  hardReloadApp();
                },
              },
            ]);
          } catch {
            Alert.alert(T.error, T.cannotClear);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {/* ✅ FULL-SCREEN KID FRIENDLY BACKGROUND (behind everything) */}
      <KidBG />

      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.page, { flexGrow: 1, paddingBottom: Math.max(20, insets.bottom + 20) }]}
        bounces={false}
        overScrollMode="never"
      >
        {/* HEADER CARD */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.profilePill}>
              <Ionicons name="sparkles" size={14} color="#5B35F2" />
              <Text style={[styles.profilePillText, rtl]}>{T.profile}</Text>
            </View>

            <TouchableOpacity onPress={onClearCache} accessibilityLabel="Clear cache" style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileRow}>
            {/* Avatar becomes a “character” */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarHalo} />
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={[styles.floatIcon, styles.float1]}>
                <Ionicons name="star" size={14} color="#111827" />
              </View>
              <View style={[styles.floatIcon, styles.float2]}>
                <Ionicons name="planet-outline" size={14} color="#111827" />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.nameText, rtl]}>{user?.name ?? "Learner"}</Text>

              <View style={styles.badgeRow}>
                <View style={styles.badgeChip}>
                  <Ionicons name="ribbon-outline" size={14} color="#111827" />
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>

                <View style={styles.langChip}>
                  <Ionicons name="language-outline" size={14} color="#111827" />
                  <Text style={styles.langText}>{lang}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="school-outline" size={14} color="#2F6BFF" />
                  <Text style={styles.metaChipText}>{grade}</Text>
                </View>

                <View style={styles.metaChip}>
                  <Ionicons name="calculator-outline" size={14} color="#5B35F2" />
                  <Text style={styles.metaChipText}>{subject}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.coachBar}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#111827" />
            <Text style={[styles.coachText, rtl]}>Maths mode on. Let’s learn one small step at a time.</Text>
          </View>
        </View>

        {/* MY LEARNING */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTop}>
            <View style={styles.sectionIcon}>
              <Ionicons name="medal-outline" size={18} color="#111827" />
            </View>
            <Text style={[styles.sectionTitle, rtl]}>{T.learningTitle}</Text>
          </View>

          <View style={styles.infoGrid}>
            <InfoItem label={T.subject} value={subject} icon="calculator-outline" color="#5B35F2" rtl={rtl} />
            <InfoItem label={T.grade} value={grade} icon="school-outline" color="#2F6BFF" rtl={rtl} />
            <InfoItem
              label={T.school}
              value={school ? String(school) : T.notSelected}
              icon="business-outline"
              color="#16A34A"
              rtl={rtl}
            />
          </View>
        </View>

        {/* TEACHER TIPS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTop}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: "rgba(251,191,36,0.22)", borderColor: "rgba(251,191,36,0.30)" },
              ]}
            >
              <Ionicons name="bulb-outline" size={18} color="#111827" />
            </View>
            <Text style={[styles.sectionTitle, rtl]}>{T.tipsTitle}</Text>
          </View>

          <View style={{ gap: 10, marginTop: 10 }}>
            <TipRow text={T.tip1} />
            <TipRow text={T.tip2} />
            <TipRow text={T.tip3} />
          </View>
        </View>

        <View style={{ flex: 1 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- Background Layer --------------------------- */

function KidBG() {
  return (
    <View pointerEvents="none" style={styles.bgWrap}>
      {/* Base */}
      <View style={styles.bgBase} />

      {/* Big soft blobs */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={[styles.blob, styles.blobC]} />
      <View style={[styles.blob, styles.blobD]} />

      {/* Sprinkle dots (confetti) */}
      <View style={[styles.dot, styles.dot1]} />
      <View style={[styles.dot, styles.dot2]} />
      <View style={[styles.dot, styles.dot3]} />
      <View style={[styles.dot, styles.dot4]} />
      <View style={[styles.dot, styles.dot5]} />
      <View style={[styles.dot, styles.dot6]} />

      {/* Tiny “stickers” as simple rounded squares */}
      <View style={[styles.sticker, styles.sticker1]} />
      <View style={[styles.sticker, styles.sticker2]} />
      <View style={[styles.sticker, styles.sticker3]} />
    </View>
  );
}

/* ----------------------------- Subcomponents ------------------------------ */

function InfoItem({
  label,
  value,
  icon,
  color,
  rtl,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  rtl?: { writingDirection: "rtl"; textAlign: "right" } | undefined;
}) {
  return (
    <View style={styles.infoItem}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}18`, borderColor: `${color}2C` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, rtl]}>{label}</Text>
        <Text style={[styles.infoValue, rtl]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function TipRow({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipDot} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

/* --------------------------------- Styles -------------------------------- */

const BG = "#EEF4FF";
const CARD = "rgba(255,255,255,0.92)";
const BORDER = "rgba(0,0,0,0.08)";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroller: { flex: 1, backgroundColor: "transparent" }, // ✅ allow background to show through
  page: { padding: 14, gap: 12 },

  /* FULL PAGE BACKGROUND */
  bgWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
  },

  blob: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 999,
    opacity: 0.95,
  },
  blobA: { top: -90, left: -110, backgroundColor: "rgba(91,53,242,0.16)" },
  blobB: { top: 40, right: -130, backgroundColor: "rgba(47,107,255,0.18)" },
  blobC: { bottom: 120, left: -120, backgroundColor: "rgba(251,191,36,0.16)" },
  blobD: { bottom: -110, right: -110, backgroundColor: "rgba(22,163,74,0.14)" },

  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.9,
  },
  dot1: { top: 110, left: 26, backgroundColor: "rgba(91,53,242,0.55)" },
  dot2: { top: 180, right: 40, backgroundColor: "rgba(47,107,255,0.55)" },
  dot3: { top: 320, left: 70, backgroundColor: "rgba(251,191,36,0.65)" },
  dot4: { top: 420, right: 110, backgroundColor: "rgba(22,163,74,0.55)" },
  dot5: { bottom: 260, left: 36, backgroundColor: "rgba(47,107,255,0.55)" },
  dot6: { bottom: 170, right: 36, backgroundColor: "rgba(91,53,242,0.55)" },

  sticker: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    backgroundColor: "rgba(255,255,255,0.70)",
    transform: [{ rotate: "12deg" }],
  },
  sticker1: { top: 260, right: 18 },
  sticker2: { top: 520, left: 18, transform: [{ rotate: "-10deg" }] },
  sticker3: { bottom: 220, right: 22, transform: [{ rotate: "8deg" }] },

  /* Cards */
  headerCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(91,53,242,0.10)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.20)",
  },
  profilePillText: { color: "#5B35F2", fontWeight: "900" },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: BORDER,
  },

  profileRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },

  avatarWrap: { width: 70, height: 70, alignItems: "center", justifyContent: "center" },
  avatarHalo: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: "rgba(251,191,36,0.18)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.28)",
    transform: [{ rotate: "12deg" }],
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "rgba(47,107,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(47,107,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#111827", fontWeight: "900", fontSize: 18 },

  floatIcon: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
  },
  float1: { top: -4, right: 2, transform: [{ rotate: "-8deg" }] },
  float2: { bottom: -6, left: 0, transform: [{ rotate: "10deg" }] },

  nameText: { color: "#111827", fontWeight: "900", fontSize: 18 },

  badgeRow: { marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(251,191,36,0.22)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.30)",
  },
  badgeText: { color: "#111827", fontWeight: "900" },

  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(22,163,74,0.14)",
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.26)",
  },
  langText: { color: "#111827", fontWeight: "900" },

  metaRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.14)",
  },
  metaChipText: { color: "#111827", fontWeight: "800" },

  coachBar: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(47,107,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(47,107,255,0.14)",
  },
  coachText: { color: "#111827", fontWeight: "800", lineHeight: 18, flex: 1 },

  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  sectionTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { color: "#111827", fontWeight: "900", fontSize: 16 },

  infoGrid: { marginTop: 12, gap: 10 },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { color: "rgba(17,24,39,0.55)", fontWeight: "900" },
  infoValue: { color: "#111827", fontWeight: "900", fontSize: 16, marginTop: 2 },

  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(91,53,242,0.08)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.14)",
  },
  tipDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#5B35F2" },
  tipText: { color: "#111827", fontWeight: "800", lineHeight: 18, flex: 1 },
});