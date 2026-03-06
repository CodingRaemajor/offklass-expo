// app/tabs/home.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import {
  loadJSON,
  saveJSON,
  ONBOARD_KEY,
  type OnboardingData,
} from "../../lib/storage";
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
    active: "Ready to learn",
    continueTitle: "Continue learning",
    continueBody: "Pick a section and keep going on your learning journey.",
    exploreTitle: "Explore",
    exploreBody: "Tap any card below to start learning, practicing, or asking for help.",
    labels: {
      lessons: "Lessons",
      quizzes: "Quizzes",
      flash: "Flashcards",
      ai: "AI Helper",
    },
    cardDesc: {
      lessons: "Watch fun lessons step-by-step",
      quizzes: "Test what you learned",
      flash: "Review important ideas fast",
      ai: "Ask questions anytime",
    },
    hint: "Tap a card to open that section.",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      tapHint: "Tap the highlighted card to continue.",
      steps: [
        { title: "Lessons", body: "Watch kid-friendly videos and learn step-by-step." },
        { title: "Quizzes", body: "Try a quiz to check what you remember." },
        { title: "Flashcards", body: "Use flashcards to practice quickly." },
        { title: "AI Helper", body: "Ask AI whenever you need help." },
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
    active: "सिक्न तयार",
    continueTitle: "अगाडि बढ्नुहोस्",
    continueBody: "कुनै पनि भाग छान्नुहोस् र सिकाइ जारी राख्नुहोस्।",
    exploreTitle: "अन्वेषण गर्नुहोस्",
    exploreBody: "तलको कार्ड ट्याप गरेर सिक्न, अभ्यास गर्न, वा मद्दत लिन सुरु गर्नुहोस्।",
    labels: {
      lessons: "Lessons",
      quizzes: "Quizzes",
      flash: "Flashcards",
      ai: "AI Helper",
    },
    cardDesc: {
      lessons: "भिडियो हेरेर चरणबद्ध सिक्नुहोस्",
      quizzes: "आफूले सिकेको कुरा जाँच्नुहोस्",
      flash: "मुख्य कुरा छिटो दोहोर्याउनुहोस्",
      ai: "जुनसुकै बेला प्रश्न सोध्नुहोस्",
    },
    hint: "कार्ड ट्याप गरेर खोल्नुहोस्।",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      tapHint: "अगाडि बढ्न हाइलाइट गरिएको कार्ड ट्याप गर्नुहोस्।",
      steps: [
        { title: "Lessons", body: "बालमैत्री भिडियो हेरेर चरणबद्ध सिक्नुहोस्।" },
        { title: "Quizzes", body: "क्विज दिएर आफूलाई जाँच्नुहोस्।" },
        { title: "Flashcards", body: "फ्ल्यासकार्डले छिटो अभ्यास गर्नुहोस्।" },
        { title: "AI Helper", body: "मद्दत चाहिँदा AI लाई सोध्नुहोस्।" },
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
    active: "سیکھنے کے لیے تیار",
    continueTitle: "سیکھنا جاری رکھیں",
    continueBody: "کوئی بھی حصہ منتخب کریں اور اپنی لرننگ جاری رکھیں۔",
    exploreTitle: "Explore",
    exploreBody: "نیچے موجود کارڈ پر ٹیپ کریں اور سیکھنا شروع کریں۔",
    labels: {
      lessons: "Lessons",
      quizzes: "Quizzes",
      flash: "Flashcards",
      ai: "AI Helper",
    },
    cardDesc: {
      lessons: "مزیدار اسباق مرحلہ وار دیکھیں",
      quizzes: "جو سیکھا ہے اسے چیک کریں",
      flash: "اہم چیزیں جلدی ریویو کریں",
      ai: "کبھی بھی سوال پوچھیں",
    },
    hint: "کارڈ پر ٹیپ کریں۔",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      tapHint: "آگے بڑھنے کے لیے نمایاں کارڈ پر ٹیپ کریں۔",
      steps: [
        { title: "Lessons", body: "ویڈیوز دیکھ کر مرحلہ وار سیکھیں۔" },
        { title: "Quizzes", body: "کوئز سے اپنی یادداشت چیک کریں۔" },
        { title: "Flashcards", body: "فلیش کارڈز سے تیزی سے پریکٹس کریں۔" },
        { title: "AI Helper", body: "جب چاہیں AI سے مدد لیں۔" },
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
    active: "শেখার জন্য প্রস্তুত",
    continueTitle: "শেখা চালিয়ে যাও",
    continueBody: "যেকোনো সেকশন বেছে নিয়ে শেখা চালিয়ে যাও।",
    exploreTitle: "Explore",
    exploreBody: "নিচের কার্ডে ট্যাপ করে শেখা শুরু করো।",
    labels: {
      lessons: "Lessons",
      quizzes: "Quizzes",
      flash: "Flashcards",
      ai: "AI Helper",
    },
    cardDesc: {
      lessons: "ভিডিও দেখে ধাপে ধাপে শিখো",
      quizzes: "তুমি কী শিখেছ যাচাই করো",
      flash: "দ্রুত গুরুত্বপূর্ণ বিষয় রিভিউ করো",
      ai: "যেকোনো সময় প্রশ্ন করো",
    },
    hint: "কার্ডে ট্যাপ করো।",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      tapHint: "এগোতে হাইলাইট করা কার্ডে ট্যাপ করো।",
      steps: [
        { title: "Lessons", body: "ভিডিও দেখে ধাপে ধাপে শেখো।" },
        { title: "Quizzes", body: "কুইজ দিয়ে মনে আছে কিনা দেখো।" },
        { title: "Flashcards", body: "ফ্ল্যাশকার্ড দিয়ে দ্রুত অনুশীলন করো।" },
        { title: "AI Helper", body: "আটকে গেলে AI সাহায্য নাও।" },
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
    active: "सीखने के लिए तैयार",
    continueTitle: "सीखना जारी रखें",
    continueBody: "कोई भी सेक्शन चुनें और अपनी learning journey जारी रखें।",
    exploreTitle: "Explore",
    exploreBody: "नीचे दिए गए कार्ड पर टैप करके सीखना शुरू करें।",
    labels: {
      lessons: "Lessons",
      quizzes: "Quizzes",
      flash: "Flashcards",
      ai: "AI Helper",
    },
    cardDesc: {
      lessons: "वीडियो देखकर स्टेप-बाय-स्टेप सीखें",
      quizzes: "जो सीखा उसे जांचें",
      flash: "मुख्य बातें जल्दी रिव्यू करें",
      ai: "कभी भी सवाल पूछें",
    },
    hint: "कार्ड खोलने के लिए टैप करें।",
    intro: {
      title: "Quick tour",
      skip: "Skip",
      next: "Next",
      back: "Back",
      done: "Done",
      tapHint: "आगे बढ़ने के लिए highlighted card टैप करें।",
      steps: [
        { title: "Lessons", body: "वीडियो देखकर स्टेप-बाय-स्टेप सीखें।" },
        { title: "Quizzes", body: "क्विज़ से खुद को जांचें।" },
        { title: "Flashcards", body: "फ्लैशकार्ड से जल्दी प्रैक्टिस करें।" },
        { title: "AI Helper", body: "अटकने पर AI से मदद लें।" },
      ],
    },
  },
} as const;

type Dict = typeof L10N[Lang extends keyof typeof L10N ? Lang : "English"];

/* -------------------------------- constants -------------------------------- */

const BLUE = "#4F7CFF";
const BG = "#F4F8FF";
const HOME_INTRO_KEY = "offklass_home_intro_done_v2";

type NavType = "lesson" | "quiz" | "flash" | "ai";
type NavCard = {
  id: string;
  type: NavType;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
};

/* --------------------------------- screen --------------------------------- */

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
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

    const s = await getHomeSnapshot();
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

  const cards: NavCard[] = useMemo(
    () => [
      {
        id: "lessons",
        type: "lesson",
        title: T.labels.lessons,
        desc: T.cardDesc.lessons,
        icon: "book-outline",
        tint: "#4F7CFF",
        bg: "#EAF0FF",
      },
      {
        id: "quizzes",
        type: "quiz",
        title: T.labels.quizzes,
        desc: T.cardDesc.quizzes,
        icon: "help-circle-outline",
        tint: "#FF8A4C",
        bg: "#FFF1E8",
      },
      {
        id: "flashcards",
        type: "flash",
        title: T.labels.flash,
        desc: T.cardDesc.flash,
        icon: "albums-outline",
        tint: "#22C55E",
        bg: "#EAFBF0",
      },
      {
        id: "ai",
        type: "ai",
        title: T.labels.ai,
        desc: T.cardDesc.ai,
        icon: "sparkles-outline",
        tint: "#A855F7",
        bg: "#F4EAFE",
      },
    ],
    [T]
  );

  const goTo = useCallback((type: NavType) => {
    if (type === "lesson") router.push("/tabs/lessons");
    if (type === "quiz") router.push("/tabs/quizzes");
    if (type === "flash") router.push("/tabs/flashcards");
    if (type === "ai") router.push("/tabs/ai");
  }, []);

  const finishIntro = useCallback(async () => {
    setShowIntro(false);
    await saveJSON(HOME_INTRO_KEY, true);
  }, []);

  const nextIntro = useCallback(() => {
    setIntroStep((s) => Math.min(s + 1, cards.length - 1));
  }, [cards.length]);

  const backIntro = useCallback(() => {
    setIntroStep((s) => Math.max(s - 1, 0));
  }, []);

  const onCardPress = useCallback(
    async (index: number) => {
      if (showIntro && index !== introStep) return;

      const card = cards[index];
      goTo(card.type);

      if (showIntro) {
        if (index === cards.length - 1) {
          await finishIntro();
        } else {
          setIntroStep(index + 1);
        }
      }
    },
    [showIntro, introStep, cards, goTo, finishIntro]
  );

  const introCopy = T.intro.steps[introStep] ?? T.intro.steps[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.topBar, { paddingTop: Math.max(10, insets.top * 0.2) }]}>
        <View style={styles.topLeft}>
          <View style={styles.logoBubble}>
            <Ionicons name="school-outline" size={20} color="#fff" />
          </View>

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
          <Pill icon="star-outline" text={`Lvl ${snap?.level ?? 1}`} />
        </View>
      </View>

      <View style={styles.main}>
        <PlayfulBackground />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: isTablet ? 28 : 16, paddingBottom: 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTextWrap}>
              <View style={styles.heroTag}>
                <Ionicons name="sparkles" size={14} color={BLUE} />
                <Text style={styles.heroTagText}>{T.active}</Text>
              </View>

              <Text style={[styles.heroTitle, rtl]}>
                {T.continueTitle}
              </Text>
              <Text style={[styles.heroBody, rtl]}>
                {T.continueBody}
              </Text>
            </View>

            <View style={styles.heroArt}>
              <View style={styles.heroCircleBig}>
                <Ionicons name="planet-outline" size={34} color="#4F7CFF" />
              </View>
              <View style={styles.heroCircleSmall}>
                <Ionicons name="sparkles" size={18} color="#FF8A4C" />
              </View>
              <View style={styles.heroCircleMini}>
                <Ionicons name="heart" size={14} color="#A855F7" />
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, rtl]}>{T.exploreTitle}</Text>
            <Text style={[styles.sectionBody, rtl]}>{T.exploreBody}</Text>
          </View>

          <View style={styles.cardGrid}>
            {cards.map((card, index) => {
              const locked = showIntro && index !== introStep;
              const focused = showIntro && index === introStep;

              return (
                <Pressable
                  key={card.id}
                  disabled={locked}
                  onPress={() => onCardPress(index)}
                  style={({ pressed }) => [
                    styles.navCard,
                    { backgroundColor: card.bg, opacity: locked ? 0.35 : 1 },
                    focused && styles.navCardFocused,
                    pressed && !locked && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {focused && <View style={[styles.cardFocusRing, { borderColor: card.tint }]} />}

                  <View style={[styles.cardIconWrap, { backgroundColor: card.tint }]}>
                    <Ionicons name={card.icon} size={28} color="#fff" />
                  </View>

                  <Text style={[styles.cardTitle, rtl]} numberOfLines={1}>
                    {card.title}
                  </Text>

                  <Text style={[styles.cardDesc, rtl]} numberOfLines={2}>
                    {card.desc}
                  </Text>

                  <View style={styles.cardArrowRow}>
                    <Text style={[styles.cardOpenText, { color: card.tint }]}>Open</Text>
                    <Ionicons name="arrow-forward" size={16} color={card.tint} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.helperTextRow}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(17,24,39,0.55)" />
            <Text style={styles.helperText}>{T.hint}</Text>
          </View>
        </ScrollView>
      </View>

      <Modal visible={showIntro} transparent animationType="fade">
        <View style={styles.introOverlay}>
          <View style={styles.introCard}>
            <View style={styles.introHeader}>
              <Text style={styles.introTitle}>{T.intro.title}</Text>
              <Pressable onPress={finishIntro} hitSlop={10}>
                <Text style={styles.introSkip}>{T.intro.skip}</Text>
              </Pressable>
            </View>

            <Text style={styles.introStepTitle}>{introCopy.title}</Text>
            <Text style={styles.introBody}>{introCopy.body}</Text>

            <View style={styles.introHintRow}>
              <Ionicons name="hand-left-outline" size={16} color="rgba(17,24,39,0.70)" />
              <Text style={styles.introHintText}>{T.intro.tapHint}</Text>
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

              {introStep < cards.length - 1 ? (
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

/* ----------------------------- background -------------------------------- */

function PlayfulBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.bgBlob, styles.bgBlobPink]} />
      <View style={[styles.bgBlob, styles.bgBlobYellow]} />
      <View style={[styles.bgBlob, styles.bgBlobGreen]} />
      <View style={[styles.bgBlob, styles.bgBlobBlue]} />

      <View style={[styles.cloud, { top: 110, left: 20 }]} />
      <View style={[styles.cloud, { top: 230, right: 18, transform: [{ scale: 0.82 }] }]} />
      <View style={[styles.cloud, { bottom: 120, left: 40, transform: [{ scale: 0.75 }] }]} />

      <Ionicons
        name="star"
        size={14}
        color="rgba(255, 196, 0, 0.55)"
        style={[styles.bgIcon, { top: 70, right: 46 }]}
      />
      <Ionicons
        name="heart"
        size={14}
        color="rgba(255, 99, 132, 0.36)"
        style={[styles.bgIcon, { top: 200, left: 34 }]}
      />
      <Ionicons
        name="sparkles"
        size={17}
        color="rgba(168, 85, 247, 0.42)"
        style={[styles.bgIcon, { bottom: 180, right: 44 }]}
      />
    </View>
  );
}

/* ----------------------------- small components ---------------------------- */

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

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  topBar: {
    backgroundColor: BLUE,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  logoBubble: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  topTitleWrap: { flex: 1 },
  topTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  topSub: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 2,
  },

  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 10,
  },

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

  pillText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    maxWidth: 120,
  },

  main: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingTop: 14 },

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  heroTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  heroTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(79,124,255,0.10)",
    marginBottom: 10,
  },

  heroTagText: {
    color: BLUE,
    fontWeight: "900",
    fontSize: 12,
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  heroBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    color: "rgba(17,24,39,0.72)",
  },

  heroArt: {
    width: 100,
    height: 100,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  heroCircleBig: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },

  heroCircleSmall: {
    position: "absolute",
    top: 6,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
  },

  heroCircleMini: {
    position: "absolute",
    bottom: 10,
    left: 4,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#F4EAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  sectionBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(17,24,39,0.65)",
    fontWeight: "700",
  },

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  navCard: {
    width: "48%",
    minHeight: 170,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    position: "relative",
    overflow: "hidden",
  },

  navCardFocused: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  cardFocusRing: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 20,
    borderWidth: 3,
  },

  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  cardDesc: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: "rgba(17,24,39,0.70)",
    flex: 1,
  },

  cardArrowRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  cardOpenText: {
    fontWeight: "900",
    fontSize: 13,
  },

  helperTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    alignSelf: "center",
  },

  helperText: {
    color: "rgba(17,24,39,0.55)",
    fontWeight: "800",
    fontSize: 12,
  },

  bgBlob: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
  },

  bgBlobPink: {
    top: -60,
    left: -70,
    backgroundColor: "rgba(255, 99, 132, 0.13)",
  },

  bgBlobYellow: {
    top: 80,
    right: -90,
    width: 260,
    height: 260,
    backgroundColor: "rgba(255, 196, 0, 0.12)",
  },

  bgBlobGreen: {
    bottom: 110,
    left: -80,
    width: 250,
    height: 250,
    backgroundColor: "rgba(34, 197, 94, 0.11)",
  },

  bgBlobBlue: {
    bottom: -80,
    right: -90,
    width: 270,
    height: 270,
    backgroundColor: "rgba(79,124,255,0.10)",
  },

  cloud: {
    position: "absolute",
    width: 78,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.65)",
  },

  bgIcon: {
    position: "absolute",
  },

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

  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  introTitle: {
    fontWeight: "900",
    fontSize: 14,
    color: "#111827",
  },

  introSkip: {
    fontWeight: "900",
    fontSize: 13,
    color: BLUE,
  },

  introStepTitle: {
    marginTop: 10,
    fontWeight: "900",
    fontSize: 16,
    color: "#111827",
  },

  introBody: {
    marginTop: 6,
    fontWeight: "700",
    fontSize: 13,
    color: "rgba(17,24,39,0.78)",
    lineHeight: 18,
  },

  introHintRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  introHintText: {
    fontWeight: "800",
    fontSize: 12,
    color: "rgba(17,24,39,0.70)",
  },

  introBtns: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  introBtnGhost: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  introBtnGhostText: {
    fontWeight: "900",
    color: "rgba(17,24,39,0.80)",
  },

  introBtnPrimary: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  introBtnPrimaryText: {
    fontWeight: "900",
    color: "#fff",
  },
});