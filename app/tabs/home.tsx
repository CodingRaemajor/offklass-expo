// app/tabs/home.tsx (or wherever your Home screen lives)
// ✅ Childish / playful background ONLY on Home (no game vibe, more kids-learning vibe)
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { loadJSON, saveJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { getHomeSnapshot } from "../../lib/progress";

/* ------------------------------- i18n helpers ------------------------------ */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N = {
  English: {
    sep: " • ",
    welcome: "Welcome",
    appName: "offklass",
    math: "Math",
    selectGrade: "Select grade - Maths",
    comingSoon: "Coming Soon",
    unit: "Unit",
    labels: {
      lessons: "Lessons",
      quizzes: "Quizzes",
      flash: "Flashcards",
      ai: "AI",
    },
    hint: "Tap an icon to open that section.",
    active: "Active",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      steps: [
        { title: "Lessons", body: "Tap here to watch videos and learn step-by-step." },
        { title: "Quizzes", body: "Test yourself with quick quizzes after learning." },
        { title: "Flashcards", body: "Practice and remember key ideas with flashcards." },
        { title: "AI Helper", body: "Ask AI when you get stuck and need help." },
      ],
    },
  },
  नेपाली: {
    sep: " • ",
    welcome: "स्वागत छ",
    appName: "offklass",
    math: "Math",
    selectGrade: "कक्षा छान्नुहोस् - Maths",
    comingSoon: "छिट्टै आउँदैछ",
    unit: "Unit",
    labels: { lessons: "Lessons", quizzes: "Quizzes", flash: "Flashcards", ai: "AI" },
    hint: "ट्याप गरेर खोल्नुहोस्।",
    active: "Active",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      steps: [
        { title: "Lessons", body: "भिडियो हेरेर विषय चरणबद्ध सिक्नुहोस्।" },
        { title: "Quizzes", body: "सिकेपछि क्विज दिएर आफूलाई जाँच्नुहोस्।" },
        { title: "Flashcards", body: "मुख्य कुरा छिटो दोहोर्याउनुहोस्।" },
        { title: "AI Helper", body: "अड्किँदा AI बाट मद्दत लिनुहोस्।" },
      ],
    },
  },
  اردو: {
    sep: " • ",
    welcome: "خوش آمدید",
    appName: "offklass",
    math: "Math",
    selectGrade: "گریڈ منتخب کریں - Maths",
    comingSoon: "جلد آ رہا ہے",
    unit: "Unit",
    labels: { lessons: "Lessons", quizzes: "Quizzes", flash: "Flashcards", ai: "AI" },
    hint: "کھولنے کے لیے آئیکن پر ٹیپ کریں۔",
    active: "Active",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      steps: [
        { title: "Lessons", body: "ویڈیوز دیکھ کر مرحلہ وار سیکھیں۔" },
        { title: "Quizzes", body: "سیکھنے کے بعد کوئز سے خود کو چیک کریں۔" },
        { title: "Flashcards", body: "اہم نکات تیزی سے دہرائیں۔" },
        { title: "AI Helper", body: "پھنسی ہوئی جگہ پر AI سے مدد لیں۔" },
      ],
    },
  },
  বাংলা: {
    sep: " • ",
    welcome: "স্বাগতম",
    appName: "offklass",
    math: "Math",
    selectGrade: "গ্রেড নির্বাচন করুন - Maths",
    comingSoon: "শীঘ্রই আসছে",
    unit: "Unit",
    labels: { lessons: "Lessons", quizzes: "Quizzes", flash: "Flashcards", ai: "AI" },
    hint: "খুলতে আইকনে ট্যাপ করুন।",
    active: "Active",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      steps: [
        { title: "Lessons", body: "ভিডিও দেখে ধাপে ধাপে শিখুন।" },
        { title: "Quizzes", body: "শেখার পর কুইজ দিয়ে নিজেকে যাচাই করুন।" },
        { title: "Flashcards", body: "মূল বিষয়গুলো দ্রুত রিভিউ করুন।" },
        { title: "AI Helper", body: "আটকে গেলে AI সাহায্য নিন।" },
      ],
    },
  },
  हिन्दी: {
    sep: " • ",
    welcome: "स्वागत है",
    appName: "offklass",
    math: "Math",
    selectGrade: "ग्रेड चुनें - Maths",
    comingSoon: "जल्द आ रहा है",
    unit: "Unit",
    labels: { lessons: "Lessons", quizzes: "Quizzes", flash: "Flashcards", ai: "AI" },
    hint: "खोलने के लिए आइकन टैप करें।",
    active: "Active",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      steps: [
        { title: "Lessons", body: "वीडियो देखकर स्टेप-बाय-स्टेप सीखें।" },
        { title: "Quizzes", body: "सीखने के बाद क्विज़ से खुद को जांचें।" },
        { title: "Flashcards", body: "मुख्य बातें जल्दी रिव्यू करें।" },
        { title: "AI Helper", body: "अटकने पर AI से मदद लें।" },
      ],
    },
  },
} as const;

type Dict = typeof L10N[Lang extends keyof typeof L10N ? Lang : "English"];

/* --------------------------------- Screen --------------------------------- */

const BLUE = "#2F6BFF";
const BG = "#F2F7FF"; // softer, kid-friendly base

type NodeType = "lesson" | "quiz" | "flash" | "ai";
type TreeNode = { id: string; type: NodeType; icon: keyof typeof Ionicons.glyphMap; text: string };

const HOME_INTRO_KEY = "offklass_home_intro_done_v1";

const UNIT1_NODES = (T: Dict): TreeNode[] => [
  { id: "u1_lessons", type: "lesson", icon: "book-outline", text: T.labels.lessons },
  { id: "u1_quiz", type: "quiz", icon: "help-circle-outline", text: T.labels.quizzes },
  { id: "u1_flash", type: "flash", icon: "albums-outline", text: T.labels.flash },
  { id: "u1_ai", type: "ai", icon: "sparkles-outline", text: T.labels.ai },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const isTablet = width >= 900;

  const [user, setUser] = useState<OnboardingData | null>(null);
  const [snap, setSnap] = useState<any>(null);

  const [showIntro, setShowIntro] = useState(false);
  const [introStep, setIntroStep] = useState(0);

  const lang = (user?.language as Lang) || "English";
  const T: Dict = (L10N as any)[LANGS.includes(lang) ? lang : "English"];

  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({
        writingDirection: "rtl" as const,
        textAlign: "right" as const,
      } as const)
    : undefined;

  const loadEverything = useCallback(async () => {
    const u = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
    setUser(u);

    if (!u) {
      setSnap(null);
      setShowIntro(false);
      return;
    }

    const s: any = await getHomeSnapshot();
    setSnap(s ?? null);

    const done = await loadJSON<boolean>(HOME_INTRO_KEY, false);
    if (!done) {
      setIntroStep(0);
      setShowIntro(true);
    }
  }, []);

  useEffect(() => {
    loadEverything();
  }, [loadEverything]);

  useFocusEffect(
    useCallback(() => {
      loadEverything();
      return () => {};
    }, [loadEverything])
  );

  const name = user?.name?.trim() || "Learner";
  const hasGrade = !!user?.grade && String(user.grade).trim().length > 0;
  const grade = hasGrade ? String(user!.grade) : null;

  const subtitle = useMemo(() => {
    if (!grade) return `${T.selectGrade}${T.sep}${T.appName}`;
    return `Grade ${grade} ${T.math}${T.sep}${T.appName}`;
  }, [grade, T]);

  const nodes = useMemo(() => UNIT1_NODES(T), [T]);

  const goTo = useCallback((type: NodeType) => {
    if (type === "lesson") router.push("/tabs/lessons");
    if (type === "quiz") router.push("/tabs/quizzes");
    if (type === "flash") router.push("/tabs/flashcards");
    if (type === "ai") router.push("/tabs/ai");
  }, []);

  const finishIntro = useCallback(async () => {
    setShowIntro(false);
    await saveJSON(HOME_INTRO_KEY, true);
  }, []);

  const skipIntro = useCallback(() => {
    finishIntro();
  }, [finishIntro]);

  const nextIntro = useCallback(() => {
    setIntroStep((s) => Math.min(s + 1, nodes.length - 1));
  }, [nodes.length]);

  const backIntro = useCallback(() => {
    setIntroStep((s) => Math.max(s - 1, 0));
  }, []);

  const isNodeEnabled = useCallback(
    (index: number) => {
      if (!showIntro) return true;
      return index === introStep;
    },
    [showIntro, introStep]
  );

  const onNodePress = useCallback(
    async (index: number) => {
      const node = nodes[index];
      if (showIntro && index !== introStep) return;

      goTo(node.type);

      if (showIntro) {
        if (index >= nodes.length - 1) {
          await finishIntro();
        } else {
          setIntroStep(index + 1);
        }
      }
    },
    [nodes, goTo, showIntro, introStep, finishIntro]
  );

  const tight = height < 740;
  const bodyPadTop = tight ? 10 : 14;

  const introCopy = T.intro.steps[introStep] ?? T.intro.steps[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(10, insets.top * 0.2) }]}>
        <View style={styles.topLeft}>
          <Pressable style={styles.topIconBtn} hitSlop={10} onPress={() => {}}>
            <Ionicons name="layers-outline" size={isTablet ? 26 : 22} color="#fff" />
          </Pressable>

          <View style={styles.topTitleWrap}>
            <Text style={[styles.topTitle, rtl]} numberOfLines={1}>
              {T.welcome}, {name}! 👋
            </Text>
            <Text style={[styles.topSub, rtl]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.topRight}>
          <Pill icon="flash-outline" text={`${snap?.streak ?? 0}`} />
          <Pill icon="ribbon-outline" text={`Level ${snap?.level ?? 1}`} />
        </View>
      </View>

      {/* Body */}
      <View style={[styles.main, { paddingHorizontal: isTablet ? 28 : 16, paddingTop: bodyPadTop }]}>
        {/* ✅ Kid-friendly decorative background (Home only) */}
        <PlayfulBackground />

        {/* Unit 1 */}
        <View style={styles.unitBlock}>
          <View style={styles.unitHeader}>
            <Text style={styles.unitTitle}>
              {T.unit} 1
            </Text>
            <View style={styles.unitTag}>
              <Ionicons name="checkmark-circle-outline" size={14} color={BLUE} />
              <Text style={styles.unitTagText}>{T.active}</Text>
            </View>
          </View>

          <View style={styles.treeRow}>
            {nodes.map((n, idx) => {
              const enabled = isNodeEnabled(idx);
              const isFocused = showIntro && idx === introStep;

              return (
                <React.Fragment key={n.id}>
                  <Pressable
                    onPress={() => onNodePress(idx)}
                    disabled={!enabled}
                    style={({ pressed }) => [
                      styles.nodeWrap,
                      !enabled && { opacity: 0.35 },
                      pressed && enabled && { transform: [{ scale: 0.98 }], opacity: 0.94 },
                    ]}
                  >
                    <View style={[styles.nodeCircle, isFocused && styles.nodeCircleFocus]}>
                      {isFocused && <View style={styles.focusRing} />}
                      <Ionicons name={n.icon} size={26} color="#fff" />
                    </View>

                    <Text style={styles.nodeText} numberOfLines={1}>
                      {n.text}
                    </Text>
                  </Pressable>

                  {idx !== nodes.length - 1 && <View style={styles.connector} />}
                </React.Fragment>
              );
            })}
          </View>

          <View style={styles.helperTextRow}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(17,24,39,0.55)" />
            <Text style={styles.helperText}>{T.hint}</Text>
          </View>
        </View>

        {/* Locked units 2–5 */}
        <View style={styles.lockedWrap}>
          {[2, 3, 4, 5].map((u) => (
            <View key={u} style={styles.lockedUnit}>
              <View style={styles.lockedLeft}>
                <View style={styles.lockIcon}>
                  <Ionicons name="lock-closed-outline" size={16} color="rgba(17,24,39,0.6)" />
                </View>
                <Text style={styles.lockedTitle}>
                  {T.unit} {u}
                </Text>
              </View>

              <View style={styles.comingSoonPill}>
                <Text style={styles.comingSoonText}>{T.comingSoon}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />
      </View>

      {/* Intro Coach Bubble Overlay */}
      <Modal visible={showIntro} transparent animationType="fade">
        <View style={styles.introOverlay}>
          <View style={styles.introCard}>
            <View style={styles.introHeader}>
              <Text style={styles.introTitle}>{T.intro.title}</Text>
              <Pressable onPress={skipIntro} hitSlop={10}>
                <Text style={styles.introSkip}>{T.intro.skip}</Text>
              </Pressable>
            </View>

            <Text style={styles.introStepTitle}>{introCopy.title}</Text>
            <Text style={styles.introBody}>{introCopy.body}</Text>

            <View style={styles.introHintRow}>
              <Ionicons name="hand-left-outline" size={16} color="rgba(17,24,39,0.70)" />
              <Text style={styles.introHintText}>Tap the highlighted button to continue.</Text>
            </View>

            <View style={styles.introBtns}>
              <Pressable
                onPress={backIntro}
                disabled={introStep === 0}
                style={({ pressed }) => [
                  styles.introBtnGhost,
                  introStep === 0 && { opacity: 0.45 },
                  pressed && introStep !== 0 && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.introBtnGhostText}>{T.intro.back}</Text>
              </Pressable>

              {introStep < nodes.length - 1 ? (
                <Pressable
                  onPress={nextIntro}
                  style={({ pressed }) => [styles.introBtnPrimary, pressed && { opacity: 0.92 }]}
                >
                  <Text style={styles.introBtnPrimaryText}>{T.intro.next}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={finishIntro}
                  style={({ pressed }) => [styles.introBtnPrimary, pressed && { opacity: 0.92 }]}
                >
                  <Text style={styles.introBtnPrimaryText}>{T.intro.done}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ----------------------------- Kid Background ----------------------------- */
/**
 * Simple playful background using soft blobs + sparkles
 * - No extra libraries
 * - pointerEvents none so it won't block taps
 */
function PlayfulBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* soft blobs */}
      <View style={[styles.bgBlob, styles.bgBlobPink]} />
      <View style={[styles.bgBlob, styles.bgBlobYellow]} />
      <View style={[styles.bgBlob, styles.bgBlobGreen]} />
      <View style={[styles.bgBlob, styles.bgBlobBlue]} />

      {/* sparkles / dots */}
      <View style={[styles.bgDot, { top: 28, left: 18, opacity: 0.55 }]} />
      <View style={[styles.bgDot, { top: 90, right: 22, opacity: 0.45 }]} />
      <View style={[styles.bgDot, { bottom: 160, left: 26, opacity: 0.50 }]} />
      <View style={[styles.bgDot, { bottom: 90, right: 30, opacity: 0.40 }]} />

      <Ionicons
        name="sparkles"
        size={18}
        color="rgba(255, 196, 0, 0.55)"
        style={[styles.bgIcon, { top: 54, right: 44 }]}
      />
      <Ionicons
        name="sparkles"
        size={16}
        color="rgba(34, 197, 94, 0.40)"
        style={[styles.bgIcon, { bottom: 210, left: 40 }]}
      />
      <Ionicons
        name="heart"
        size={16}
        color="rgba(255, 99, 132, 0.35)"
        style={[styles.bgIcon, { top: 190, left: 26 }]}
      />
    </View>
  );
}

/* ----------------------------- Small Components ---------------------------- */

function Pill({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={styles.pillText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/* --------------------------------- Styles --------------------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  topBar: {
    backgroundColor: BLUE,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  topLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  topTitleWrap: { flex: 1 },
  topTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  topSub: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 12, marginTop: 2 },

  topRight: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  pillText: { color: "#fff", fontWeight: "800", fontSize: 12, maxWidth: 120 },

  main: { flex: 1, backgroundColor: BG },

  /* ------------------ playful background styles (HOME ONLY) ------------------ */

  bgBlob: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  bgBlobPink: {
    top: -60,
    left: -70,
    backgroundColor: "rgba(255, 99, 132, 0.14)",
  },
  bgBlobYellow: {
    top: 30,
    right: -80,
    backgroundColor: "rgba(255, 196, 0, 0.14)",
    width: 260,
    height: 260,
  },
  bgBlobGreen: {
    bottom: 120,
    left: -90,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    width: 260,
    height: 260,
  },
  bgBlobBlue: {
    bottom: -80,
    right: -90,
    backgroundColor: "rgba(47, 107, 255, 0.10)",
    width: 260,
    height: 260,
  },
  bgDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: "rgba(47, 107, 255, 0.25)",
  },
  bgIcon: {
    position: "absolute",
  },

  /* ------------------------------ content card ------------------------------ */

  unitBlock: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },

  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  unitTitle: { fontWeight: "900", fontSize: 16, color: "#111827" },

  unitTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(47,107,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(47,107,255,0.14)",
  },
  unitTagText: { color: BLUE, fontWeight: "900", fontSize: 12 },

  treeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  nodeWrap: { alignItems: "center", width: 96 },

  nodeCircle: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: "rgba(47,107,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.85)",
    shadowColor: "#2F6BFF",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    position: "relative",
  },

  nodeCircleFocus: {
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  focusRing: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "rgba(47,107,255,0.35)",
    backgroundColor: "rgba(47,107,255,0.08)",
  },

  nodeText: {
    marginTop: 10,
    fontWeight: "900",
    fontSize: 14,
    color: "rgba(17,24,39,0.88)",
  },

  connector: {
    width: 26,
    height: 4,
    backgroundColor: "rgba(17,24,39,0.15)",
    borderRadius: 999,
    marginHorizontal: 10,
  },

  helperTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    alignSelf: "center",
  },
  helperText: { color: "rgba(17,24,39,0.55)", fontWeight: "800", fontSize: 12 },

  lockedWrap: { marginTop: 14, gap: 10 },

  lockedUnit: {
    backgroundColor: "rgba(255,255,255,0.70)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  lockedLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  lockIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedTitle: { fontWeight: "900", color: "#111827", fontSize: 14 },

  comingSoonPill: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonText: { color: "rgba(17,24,39,0.70)", fontWeight: "900", fontSize: 12 },

  /* --------------------------- Intro overlay styles -------------------------- */

  introOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.35)",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 16,
  },

  introCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },

  introHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  introTitle: { fontWeight: "900", fontSize: 14, color: "#111827" },
  introSkip: { fontWeight: "900", fontSize: 13, color: BLUE },

  introStepTitle: { marginTop: 10, fontWeight: "900", fontSize: 16, color: "#111827" },
  introBody: { marginTop: 6, fontWeight: "700", fontSize: 13, color: "rgba(17,24,39,0.78)", lineHeight: 18 },

  introHintRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  introHintText: { fontWeight: "800", fontSize: 12, color: "rgba(17,24,39,0.70)" },

  introBtns: { marginTop: 14, flexDirection: "row", justifyContent: "space-between", gap: 10 },

  introBtnGhost: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  introBtnGhostText: { fontWeight: "900", color: "rgba(17,24,39,0.80)" },

  introBtnPrimary: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  introBtnPrimaryText: { fontWeight: "900", color: "#fff" },
});