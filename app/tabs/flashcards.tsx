// app/(tabs)/flashcards.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { AskAIButton } from "../../components/AskAIButton";
import { NextStepFooter } from "../../components/NextStepFooter";

/* --------------------------------- Data ---------------------------------- */

type Card = { id: string; front: string; back: string; topic?: string };

const SEED: Card[] = [
  {
    id: "1",
    front: "What does 3 hundreds blocks, 2 tens blocks, and 5 ones blocks represent?",
    back: "325",
    topic: "Place Value Blocks",
  },
  {
    id: "2",
    front: "In the number 4,567, what is the value of the digit 5?",
    back: "500 (5 hundreds)",
    topic: "Place Value Tables",
  },
  {
    id: "3",
    front: "What is the place value of 8 in the number 28,394?",
    back: "Thousands place",
    topic: "Finding Place Value",
  },
  {
    id: "4",
    front: "Using digits 7, 2, 9, 1, what's the largest number you can make?",
    back: "9,721",
    topic: "Creating the Largest Number",
  },
  {
    id: "5",
    front: "Write 6,000 + 300 + 40 + 8 in standard form.",
    back: "6,348",
    topic: "Expanded Form",
  },
  {
    id: "6",
    front: "How many tens are in the number 3,540?",
    back: "4 (the digit in the tens place)",
    topic: "Place Value Blocks",
  },
  {
    id: "7",
    front: "In 50,267, what role does the zero play?",
    back: "Placeholder in thousands position",
    topic: "Place Value Tables",
  },
  {
    id: "8",
    front: "What is the smallest number you can make with digits 5, 8, 2, 6?",
    back: "2,568",
    topic: "Creating the Largest Number",
  },
  {
    id: "9",
    front: "In a place value chart, what number has: 7 thousands, 0 hundreds, 4 tens, 9 ones?",
    back: "7,049",
    topic: "Place Value Tables",
  },
  {
    id: "10",
    front: "What is the expanded form of 8,205?",
    back: "8,000 + 200 + 5",
    topic: "Finding Place Value",
  },
];

/* -------------------------------- i18n bits ------------------------------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    questionLbl: string;
    answerLbl: string;
    topicLbl: string;
    prev: string;
    showAnswer: string;
    hideAnswer: string;
    next: string;
    gotIt: string;
    needsPractice: string;
    correct: string;
    incorrect: string;
    completed: string;
    reset: string;
    finishedTitle: string;
    finishedMsg: string;
    practiceModeLabel: string;
    pointsLbl: string;

    // game-y
    levelComplete: string;
    streak: string;
    rewardsTitle: string;
    targetsTitle: string;
    playAgain: string;
    practiceWrong: string;
    noWrong: string;
    rank: string;
    rankA: string;
    rankB: string;
    rankC: string;
    rankD: string;

    // new UI hints
    tapToFlipHint: string;
    deckLabel: string;
    practiceLabel: string;
  }
> = {
  English: {
    title: "🧠 Place Value Flashcards!",
    subtitle: "Flip the card, earn points, build your streak!",
    questionLbl: "Question",
    answerLbl: "Answer",
    topicLbl: "Topic",
    prev: "Prev",
    showAnswer: "Show Answer",
    hideAnswer: "Hide Answer",
    next: "Next",
    gotIt: "I Got It",
    needsPractice: "Needs Practice",
    correct: "Correct",
    incorrect: "Needs Practice",
    completed: "Completed",
    reset: "Reset",
    finishedTitle: "Great job!",
    finishedMsg: "You’ve completed the flashcards.",
    practiceModeLabel: "Practice cards marked 'Needs Practice'",
    pointsLbl: "Points",

    levelComplete: "Deck Complete!",
    streak: "Streak",
    rewardsTitle: "Rewards",
    targetsTitle: "Practice Targets",
    playAgain: "Play Again",
    practiceWrong: "Practice Needs Practice Cards",
    noWrong: "Perfect! No cards to practice 🎉",
    rank: "Rank",
    rankA: "Legend",
    rankB: "Pro",
    rankC: "Rising Star",
    rankD: "Keep Going",

    tapToFlipHint: "Tip: Tap “Show Answer” to flip",
    deckLabel: "Deck",
    practiceLabel: "Practice",
  },
  नेपाली: {
    title: "🧠 स्थानीय मूल्य फ्ल्यासकार्ड!",
    subtitle: "कार्ड फ्लिप गर्नुहोस्, अंक कमाउनुहोस्, स्ट्रिक बनाउनुहोस्!",
    questionLbl: "प्रश्न",
    answerLbl: "उत्तर",
    topicLbl: "विषय",
    prev: "अघिल्लो",
    showAnswer: "उत्तर देखाउनुहोस्",
    hideAnswer: "उत्तर लुकाउनुहोस्",
    next: "अर्को",
    gotIt: "मैले बुझें",
    needsPractice: "अभ्यास चाहियो",
    correct: "सही",
    incorrect: "अभ्यास चाहियो",
    completed: "पूरा",
    reset: "रिसेट",
    finishedTitle: "धेरै राम्रो!",
    finishedMsg: "तपाईंले फ्ल्यासकार्ड पूरा गर्नुभयो।",
    practiceModeLabel: "'अभ्यास चाहियो' कार्डहरू मात्र अभ्यास गर्नुहोस्",
    pointsLbl: "अंक",

    levelComplete: "डेक पूरा!",
    streak: "स्ट्रिक",
    rewardsTitle: "इनाम",
    targetsTitle: "अभ्यास लक्ष्य",
    playAgain: "फेरि खेल्नुहोस्",
    practiceWrong: "अभ्यास चाहियो कार्ड अभ्यास",
    noWrong: "एकदमै राम्रो! कुनै कार्ड बाँकी छैन 🎉",
    rank: "र्‍याङ्क",
    rankA: "लेजेंड",
    rankB: "प्रो",
    rankC: "राइजिङ स्टार",
    rankD: "जारी राख्नुहोस्",

    tapToFlipHint: "टिप: “उत्तर देखाउनुहोस्” ट्याप गरेर फ्लिप गर्नुहोस्",
    deckLabel: "डेक",
    practiceLabel: "अभ्यास",
  },
  اردو: {
    title: "🧠 مقامی قدر فلیش کارڈز!",
    subtitle: "کارڈ پلٹیں، پوائنٹس بنائیں، اسٹریک بڑھائیں!",
    questionLbl: "سوال",
    answerLbl: "جواب",
    topicLbl: "موضوع",
    prev: "پچھلا",
    showAnswer: "جواب دکھائیں",
    hideAnswer: "جواب چھپائیں",
    next: "اگلا",
    gotIt: "سمجھ گیا",
    needsPractice: "مزید مشق",
    correct: "درست",
    incorrect: "مزید مشق",
    completed: "مکمل",
    reset: "ری سیٹ",
    finishedTitle: "شاندار!",
    finishedMsg: "آپ نے فلیش کارڈز مکمل کر لیے!",
    practiceModeLabel: "صرف 'مزید مشق' والے کارڈز کی مشق کریں",
    pointsLbl: "پوائنٹس",

    levelComplete: "ڈیک مکمل!",
    streak: "اسٹریک",
    rewardsTitle: "انعامات",
    targetsTitle: "پریکٹس ہدف",
    playAgain: "دوبارہ کھیلیں",
    practiceWrong: "مزید مشق والے کارڈز",
    noWrong: "زبردست! کوئی کارڈ باقی نہیں 🎉",
    rank: "رینک",
    rankA: "لیجنڈ",
    rankB: "پرو",
    rankC: "رائزنگ اسٹار",
    rankD: "جاری رکھیں",

    tapToFlipHint: "ٹِپ: “جواب دکھائیں” پر ٹیپ کر کے پلٹیں",
    deckLabel: "ڈیک",
    practiceLabel: "پریکٹس",
  },
  বাংলা: {
    title: "🧠 স্থানীয় মান ফ্ল্যাশকার্ড!",
    subtitle: "কার্ড ফ্লিপ করুন, পয়েন্ট পান, স্ট্রিক বাড়ান!",
    questionLbl: "প্রশ্ন",
    answerLbl: "উত্তর",
    topicLbl: "বিষয়",
    prev: "পূর্ববর্তী",
    showAnswer: "উত্তর দেখুন",
    hideAnswer: "উত্তর লুকান",
    next: "পরবর্তী",
    gotIt: "বুঝেছি",
    needsPractice: "আরো অনুশীলন",
    correct: "সঠিক",
    incorrect: "আরো অনুশীলন",
    completed: "সম্পন্ন",
    reset: "রিসেট",
    finishedTitle: "দারুণ!",
    finishedMsg: "আপনি ফ্ল্যাশকার্ড শেষ করেছেন!",
    practiceModeLabel: "শুধু 'আরো অনুশীলন' চিহ্নিত কার্ডগুলো অনুশীলন করুন",
    pointsLbl: "পয়েন্ট",

    levelComplete: "ডেক শেষ!",
    streak: "স্ট্রিক",
    rewardsTitle: "রিওয়ার্ড",
    targetsTitle: "প্র্যাকটিস টার্গেট",
    playAgain: "আবার খেলুন",
    practiceWrong: "আরো অনুশীলন কার্ড",
    noWrong: "চমৎকার! কোনো কার্ড বাকি নেই 🎉",
    rank: "র‍্যাঙ্ক",
    rankA: "লেজেন্ড",
    rankB: "প্রো",
    rankC: "রাইজিং স্টার",
    rankD: "চালিয়ে যান",

    tapToFlipHint: "টিপ: “উত্তর দেখুন” ট্যাপ করে ফ্লিপ করুন",
    deckLabel: "ডেক",
    practiceLabel: "প্র্যাকটিস",
  },
  हिन्दी: {
    title: "🧠 स्थानीय मान फ्लैशकार्ड!",
    subtitle: "कार्ड फ्लिप करें, पॉइंट्स कमाएँ, स्ट्रीक बढ़ाएँ!",
    questionLbl: "प्रश्न",
    answerLbl: "उत्तर",
    topicLbl: "विषय",
    prev: "पिछला",
    showAnswer: "उत्तर दिखाएँ",
    hideAnswer: "उत्तर छिपाएँ",
    next: "अगला",
    gotIt: "समझ गया/गई",
    needsPractice: "और अभ्यास चाहिए",
    correct: "सही",
    incorrect: "और अभ्यास चाहिए",
    completed: "पूर्ण",
    reset: "रीसेट",
    finishedTitle: "बहुत बढ़िया!",
    finishedMsg: "आपने फ्लैशकार्ड पूरे कर लिए!",
    practiceModeLabel: "सिर्फ 'और अभ्यास चाहिए' वाले कार्ड्स का अभ्यास करें",
    pointsLbl: "पॉइंट्स",

    levelComplete: "Deck Complete!",
    streak: "Streak",
    rewardsTitle: "Rewards",
    targetsTitle: "Practice Targets",
    playAgain: "Play Again",
    practiceWrong: "Practice Needs Practice Cards",
    noWrong: "Perfect! No cards to practice 🎉",
    rank: "Rank",
    rankA: "Legend",
    rankB: "Pro",
    rankC: "Rising Star",
    rankD: "Keep Going",

    tapToFlipHint: "टिप: “उत्तर दिखाएँ” टैप करके फ्लिप करें",
    deckLabel: "Deck",
    practiceLabel: "Practice",
  },
};

/* ----------------------------- helpers ----------------------------------- */

function clampPct(n: number) {
  return Math.max(0, Math.min(100, n));
}
function starsForPct(p: number) {
  if (p >= 90) return 5;
  if (p >= 75) return 4;
  if (p >= 55) return 3;
  if (p >= 35) return 2;
  return 1;
}

/* ------------------------------- Component -------------------------------- */

export default function Flashcards() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 900;
  const isLandscape = width > height;

  const [cards, setCards] = useState<Card[]>([]);
  const [baseCards, setBaseCards] = useState<Card[]>(SEED);
  const [current, setCurrent] = useState(0);

  // tracking
  const [completed, setCompleted] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [needsPracticeIds, setNeedsPracticeIds] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [mode, setMode] = useState<"deck" | "practice">("deck");

  // streak
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // language
  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({
        writingDirection: "rtl" as "rtl",
        textAlign: "right" as const,
      } as const)
    : undefined;

  // flip animation
  const flip = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);

  const rotateY = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const rotateYBack = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  // tiny “pop” when marking answer
  const pop = useRef(new Animated.Value(1)).current;

  // background float
  const floaty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floaty, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floaty, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [floaty]);

  const bubbleShift = floaty.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const bubbleShift2 = floaty.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

  useEffect(() => {
    (async () => {
      const onboarding = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const savedLang = (onboarding?.language as Lang) || "English";
      setLang(LANGS.includes(savedLang) ? savedLang : "English");

      const stored = await loadJSON<Card[]>("cards", SEED);
      const base = stored.length ? stored : SEED;
      setBaseCards(base);
      setCards(base);

      resetSession(true, base);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCard = cards[current] ?? null;

  const points = correct * 10 + bestStreak * 5 + (isFinished ? 25 : 0);

  const progressPct = useMemo(() => {
    return cards.length ? Math.round((completed.length / cards.length) * 100) : 0;
  }, [completed.length, cards.length]);

  const resultPct = useMemo(() => {
    const totalDone = correct + incorrect;
    return totalDone === 0 ? 0 : Math.round((correct / totalDone) * 100);
  }, [correct, incorrect]);

  const starCount = useMemo(() => starsForPct(resultPct), [resultPct]);

  const rankLabel = useMemo(() => {
    if (resultPct >= 90) return T.rankA;
    if (resultPct >= 75) return T.rankB;
    if (resultPct >= 55) return T.rankC;
    return T.rankD;
  }, [resultPct, T]);

  const rankIcon = useMemo(() => {
    if (resultPct >= 90) return "trophy";
    if (resultPct >= 75) return "medal";
    if (resultPct >= 55) return "ribbon";
    return "sparkles";
  }, [resultPct]);

  function animateFlip(toBack: boolean) {
    Animated.timing(flip, {
      toValue: toBack ? 1 : 0,
      duration: 420,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => setShowBack(toBack));
  }

  function resetFlip(init = false) {
    if (init) {
      flip.setValue(0);
      setShowBack(false);
      return;
    }
    animateFlip(false);
  }

  function onShowAnswer() {
    animateFlip(!showBack);
  }

  function nextCard() {
    resetFlip();
    if (current < cards.length - 1) {
      setCurrent((i) => i + 1);
    } else {
      setIsFinished(true);
    }
  }

  function prevCard() {
    if (current > 0) {
      resetFlip();
      setCurrent((i) => i - 1);
    }
  }

  function popOnce() {
    pop.setValue(1);
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }

  function mark(isCorrectAns: boolean) {
    if (!currentCard || isFinished) return;

    popOnce();

    if (!completed.includes(currentCard.id)) {
      setCompleted((s) => [...s, currentCard.id]);
      if (isCorrectAns) {
        setCorrect((n) => n + 1);
        setStreak((s) => {
          const ns = s + 1;
          setBestStreak((b) => Math.max(b, ns));
          return ns;
        });
      } else {
        setIncorrect((n) => n + 1);
        setStreak(0);
      }
    }

    if (!isCorrectAns && !needsPracticeIds.includes(currentCard.id)) {
      setNeedsPracticeIds((ids) => [...ids, currentCard.id]);
    }

    nextCard();
  }

  function resetSession(init = false, base?: Card[]) {
    const source = base ?? (baseCards.length ? baseCards : SEED);
    setMode("deck");
    setCards(source);
    setCurrent(0);
    setCompleted([]);
    setCorrect(0);
    setIncorrect(0);
    setNeedsPracticeIds((ids) => ids); // keep practice ids across runs
    setStreak(0);
    setBestStreak(0);
    setIsFinished(false);
    resetFlip(init);
  }

  function startNeedsPracticeMode() {
    if (!needsPracticeIds.length) {
      Alert.alert(T.finishedTitle, T.noWrong);
      return;
    }
    const practiceCards = baseCards.filter((c) => needsPracticeIds.includes(c.id));
    if (!practiceCards.length) return;

    setMode("practice");
    setCards(practiceCards);
    setCurrent(0);
    setCompleted([]);
    setCorrect(0);
    setIncorrect(0);
    setStreak(0);
    setBestStreak(0);
    setIsFinished(false);
    resetFlip(true);
  }

  // ✅ responsive card sizing (no fixed height that breaks on rotate)
  // clamp so it never gets too tall or too tiny
  const maxCardHeight = Math.min(isTablet ? 420 : 340, Math.floor(height * (isLandscape ? 0.55 : 0.38)));
  const cardHeight = Math.max(isTablet ? 300 : 260, maxCardHeight);
  const cardWrapHeight = cardHeight + 30;

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <LinearGradient colors={["#FFF6D5", "#EAF4FF", "#E9FFF1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bg}>
        {/* background bubbles */}
        <Animated.View style={[s.bubble, s.b1, { transform: [{ translateY: bubbleShift }] }]} />
        <Animated.View style={[s.bubble, s.b2, { transform: [{ translateY: bubbleShift2 }] }]} />
        <Animated.View style={[s.bubble, s.b3, { transform: [{ translateY: bubbleShift }] }]} />
        <Animated.View style={[s.bubble, s.b4, { transform: [{ translateY: bubbleShift2 }] }]} />

        {/* ✅ SCROLLVIEW so rotate never cuts UI */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.content,
            {
              paddingTop: 12 + insets.top * 0.05,
              paddingBottom: Math.max(18, insets.bottom + 18),
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.titleRow}>
              <View style={s.mascot}>
                <Ionicons name="sparkles" size={18} color="#111827" />
              </View>
              <Text style={[s.h1, rtl]}>{T.title}</Text>
            </View>
            <Text style={[s.sub, rtl]}>{T.subtitle}</Text>

            <View style={s.headerStatsRow}>
              <View style={[s.pill, s.pillSoftBlue]}>
                <Ionicons name="flash" size={14} color="#2F6BFF" />
                <Text style={s.pillTxt}>
                  {T.pointsLbl}: <Text style={{ fontWeight: "900" }}>{points}</Text>
                </Text>
              </View>

              <View style={[s.pill, s.pillSoftOrange]}>
                <Ionicons name="flame" size={14} color="#F59E0B" />
                <Text style={s.pillTxt}>
                  {T.streak}: <Text style={{ fontWeight: "900" }}>{streak}</Text>
                </Text>
              </View>

              <View style={[s.pill, s.pillSoftGreen]}>
                <Ionicons name="checkmark-done" size={14} color="#16A34A" />
                <Text style={s.pillTxt}>
                  {completed.length}/{cards.length}
                </Text>
              </View>
            </View>

            <View style={s.progressOuter}>
              <LinearGradient
                colors={["#5B35F2", "#2F6BFF", "#22C55E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.progressInner, { width: `${clampPct(progressPct)}%` }]}
              />
            </View>
          </View>

          {!isFinished ? (
            <>
              {/* Flip Card */}
              <Animated.View style={{ transform: [{ scale: pop }] }}>
                <View style={[s.cardWrap, { height: cardWrapHeight }]}>
                  {/* Front */}
                  <Animated.View
                    style={[
                      s.card,
                      s.cardFront,
                      {
                        height: cardHeight,
                        transform: [{ perspective: 1000 }, { rotateY }],
                        backfaceVisibility: "hidden" as any,
                      },
                    ]}
                  >
                    <View style={s.cardTopRow}>
                      <View style={[s.tag, mode === "practice" ? s.tagOrange : s.tagPurple]}>
                        <Text style={mode === "practice" ? s.tagTxtOrange : s.tagTxtPurple}>
                          {mode === "practice" ? T.practiceLabel : T.deckLabel}
                        </Text>
                      </View>

                      {!!currentCard?.topic && (
                        <View style={[s.tag, s.tagBlue]}>
                          <Text style={s.tagTxtBlue} numberOfLines={1}>
                            {currentCard.topic}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[s.label, rtl]}>{T.questionLbl}</Text>
                    <Text style={[s.big, rtl]}>{currentCard?.front ?? "—"}</Text>

                    <View style={s.tapHint}>
                      <Ionicons name="hand-left-outline" size={16} color="rgba(17,24,39,0.75)" />
                      <Text style={[s.tapHintTxt, rtl]}>{T.tapToFlipHint}</Text>
                    </View>
                  </Animated.View>

                  {/* Back */}
                  <Animated.View
                    style={[
                      s.card,
                      s.cardBack,
                      {
                        height: cardHeight,
                        transform: [{ perspective: 1000 }, { rotateY: rotateYBack }],
                        backfaceVisibility: "hidden" as any,
                      },
                    ]}
                  >
                    <View style={s.cardTopRow}>
                      <View style={[s.tag, s.tagGreen]}>
                        <Text style={s.tagTxtGreen}>{T.answerLbl}</Text>
                      </View>

                      {!!currentCard?.topic && (
                        <View style={[s.tag, s.tagBlue]}>
                          <Text style={s.tagTxtBlue} numberOfLines={1}>
                            {currentCard.topic}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[s.label, rtl]}>{T.answerLbl}</Text>
                    <Text style={[s.big, rtl]}>{currentCard?.back ?? "—"}</Text>

                    <View style={s.backBadgeRow}>
                      <View style={s.backBadge}>
                        <Ionicons name="bulb" size={14} color="#111827" />
                        <Text style={s.backBadgeTxt}>Nice! Now choose ✅ or ❌</Text>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              </Animated.View>

              {/* Controls */}
              <View style={s.row}>
                <TouchableOpacity disabled={current === 0} onPress={prevCard} style={[s.btn, s.btnGhost, current === 0 && s.disabled]}>
                  <Ionicons name="arrow-back" size={18} color="#111827" />
                  <Text style={[s.btnGhostTxt, rtl]}>{T.prev}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onShowAnswer} disabled={!currentCard} style={[s.btn, s.btnPrimary, !currentCard && s.disabled]}>
                  <Ionicons name="swap-horizontal" size={18} color="#fff" />
                  <Text style={[s.btnPrimaryTxt, rtl]}>{showBack ? T.hideAnswer : T.showAnswer}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={nextCard} disabled={!currentCard} style={[s.btn, s.btnGhost, !currentCard && s.disabled]}>
                  <Text style={[s.btnGhostTxt, rtl]}>{T.next}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* Correct/Incorrect + Ask AI (only when flipped) */}
              {showBack && (
                <>
                  <View style={[s.row, { marginTop: 10 }]}>
                    <TouchableOpacity onPress={() => mark(true)} style={[s.bigBtn, s.bigBtnGood]}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={[s.bigBtnTxt, rtl]}>{T.gotIt}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => mark(false)} style={[s.bigBtn, s.bigBtnBad]}>
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={[s.bigBtnTxt, rtl]}>{T.needsPractice}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <AskAIButton
                      question={currentCard?.front ?? ""}
                      userAnswer={currentCard?.back ?? ""}
                      correctAnswer={currentCard?.back ?? ""}
                      contextType="flashcard"
                    />
                  </View>
                </>
              )}

              {/* Practice toggle */}
              <TouchableOpacity onPress={startNeedsPracticeMode} style={s.practiceToggle}>
                <Ionicons name="refresh" size={16} color="#111827" />
                <Text style={[s.practiceToggleText, rtl]}>{T.practiceModeLabel}</Text>
              </TouchableOpacity>

              {/* Reset */}
              <View style={{ marginTop: 10 }}>
                <TouchableOpacity onPress={() => resetSession()} style={s.resetBtn}>
                  <Ionicons name="reload" size={18} color="#fff" />
                  <Text style={s.resetTxt}>{T.reset}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ marginTop: 8 }}>
              <LinearGradient
                colors={["#FF7A59", "#FFB703", "#2F6BFF", "#5B35F2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.doneBanner}
              >
                <View style={s.doneBannerTop}>
                  <View style={s.doneBadge}>
                    <Ionicons name={rankIcon as any} size={18} color="#111827" />
                    <Text style={s.doneBadgeText}>
                      {T.rank}: {rankLabel}
                    </Text>
                  </View>
                  <View style={s.doneStarsRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name={i < starCount ? "star" : "star-outline"} size={18} color="#FFD54A" />
                    ))}
                  </View>
                </View>

                <Text style={[s.doneTitle, rtl]}>{T.levelComplete}</Text>

                <View style={s.doneScoreRow}>
                  <View style={s.bigScorePill}>
                    <Text style={s.bigScoreText}>{resultPct}%</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.doneScore, rtl]}>
                      {correct} correct • {incorrect} needs practice
                    </Text>
                    <View style={s.miniBarOuter}>
                      <View style={[s.miniBarInner, { width: `${clampPct(resultPct)}%` }]} />
                    </View>
                  </View>
                </View>
              </LinearGradient>

              <View style={s.doneCardsRow}>
                <View style={s.smallCard}>
                  <Text style={s.smallCardTitle}>{T.rewardsTitle}</Text>
                  <View style={{ gap: 10, marginTop: 10 }}>
                    <View style={s.rewardRow}>
                      <View style={s.rewardIcon}>
                        <Ionicons name="flash" size={16} color="#2F6BFF" />
                      </View>
                      <Text style={s.rewardText}>+ {correct * 10} XP</Text>
                    </View>
                    <View style={s.rewardRow}>
                      <View style={s.rewardIcon}>
                        <Ionicons name="flame" size={16} color="#F59E0B" />
                      </View>
                      <Text style={s.rewardText}>Best streak: {bestStreak}</Text>
                    </View>
                    <View style={s.rewardRow}>
                      <View style={s.rewardIcon}>
                        <Ionicons name="diamond" size={16} color="#5B35F2" />
                      </View>
                      <Text style={s.rewardText}>Points: {points}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.smallCard}>
                  <Text style={s.smallCardTitle}>{T.targetsTitle}</Text>
                  <View style={{ marginTop: 10 }}>
                    {needsPracticeIds.length === 0 ? (
                      <Text style={s.targetsText}>{T.noWrong}</Text>
                    ) : (
                      <>
                        <Text style={s.targetsText}>{needsPracticeIds.length} cards to practice</Text>
                        <View style={{ marginTop: 10, gap: 8 }}>
                          {baseCards
                            .filter((c) => needsPracticeIds.includes(c.id))
                            .slice(0, 3)
                            .map((c) => (
                              <View key={c.id} style={s.targetPill}>
                                <Ionicons name="flag" size={14} color="#111827" />
                                <Text style={s.targetPillText} numberOfLines={1}>
                                  {c.topic ?? "Practice"}
                                </Text>
                              </View>
                            ))}
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {needsPracticeIds.length > 0 && (
                <TouchableOpacity onPress={startNeedsPracticeMode} style={s.donePracticeBtn}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={s.donePracticeText}>{T.practiceWrong}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => resetSession()} style={s.doneReplayBtn}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={s.doneReplayText}>{T.playAgain}</Text>
              </TouchableOpacity>

              <View style={{ marginTop: 12 }}>
                <NextStepFooter onPlayAgain={() => resetSession()} nextLessonPath="/tabs/lessons" nextQuizPath="/tabs/quizzes" />
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

/* -------------------------------- Styles --------------------------------- */

const WHITE = "rgba(255,255,255,0.96)";

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#EAF4FF" },
  bg: { flex: 1 },

  // ✅ scroll content container
  content: { paddingHorizontal: 14 },

  /* background bubbles */
  bubble: { position: "absolute", borderRadius: 999, opacity: 0.55 },
  b1: { width: 220, height: 220, backgroundColor: "rgba(47,107,255,0.18)", top: -60, left: -70 },
  b2: { width: 180, height: 180, backgroundColor: "rgba(34,197,94,0.16)", top: 90, right: -70 },
  b3: { width: 260, height: 260, backgroundColor: "rgba(255,183,3,0.16)", bottom: -90, left: -80 },
  b4: { width: 160, height: 160, backgroundColor: "rgba(91,53,242,0.14)", bottom: 90, right: -60 },

  header: { alignItems: "center", marginBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mascot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  h1: { fontSize: 22, fontWeight: "900", color: "#111827" },
  sub: { color: "rgba(17,24,39,0.68)", marginTop: 6, fontWeight: "800", textAlign: "center" },

  headerStatsRow: { marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: WHITE,
    borderWidth: 1,
  },
  pillSoftBlue: { borderColor: "rgba(47,107,255,0.18)" },
  pillSoftOrange: { borderColor: "rgba(245,158,11,0.22)" },
  pillSoftGreen: { borderColor: "rgba(34,197,94,0.22)" },
  pillTxt: { color: "#111827", fontWeight: "900" },

  progressOuter: {
    marginTop: 10,
    height: 12,
    width: "100%",
    maxWidth: 520,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.08)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  progressInner: { height: "100%", borderRadius: 999 },

  cardWrap: { alignItems: "center", justifyContent: "center", marginTop: 10 },
  card: {
    position: "absolute",
    width: "100%",
    maxWidth: 560,
    borderRadius: 24,
    padding: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFront: { borderColor: "rgba(47,107,255,0.18)" },
  cardBack: { borderColor: "rgba(34,197,94,0.22)" },

  cardTopRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },

  tag: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, maxWidth: "68%" },
  tagPurple: { backgroundColor: "rgba(91,53,242,0.10)", borderColor: "rgba(91,53,242,0.22)" },
  tagTxtPurple: { color: "#5B35F2", fontWeight: "900" },
  tagOrange: { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.26)" },
  tagTxtOrange: { color: "#B45309", fontWeight: "900" },
  tagBlue: { backgroundColor: "rgba(47,107,255,0.10)", borderColor: "rgba(47,107,255,0.22)" },
  tagTxtBlue: { color: "#2F6BFF", fontWeight: "900" },
  tagGreen: { backgroundColor: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.24)" },
  tagTxtGreen: { color: "#16A34A", fontWeight: "900" },

  label: { color: "rgba(17,24,39,0.70)", fontWeight: "900", marginBottom: 8 },
  big: { color: "#111827", fontSize: 24, fontWeight: "900", textAlign: "center", lineHeight: 32 },

  tapHint: {
    position: "absolute",
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(17,24,39,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  tapHintTxt: { color: "rgba(17,24,39,0.78)", fontWeight: "900" },

  backBadgeRow: { position: "absolute", bottom: 12 },
  backBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.12)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
  },
  backBadgeTxt: { color: "#111827", fontWeight: "900" },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 },

  btn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnGhost: { backgroundColor: "#FFFFFF", borderColor: "rgba(17,24,39,0.14)" },
  btnGhostTxt: { color: "#111827", fontWeight: "900", fontSize: 15 },
  btnPrimary: { backgroundColor: "#5B35F2", borderColor: "#5B35F2" },
  btnPrimaryTxt: { color: "#fff", fontWeight: "900", fontSize: 15 },

  bigBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  bigBtnGood: { backgroundColor: "#16A34A" },
  bigBtnBad: { backgroundColor: "#DC2626" },
  bigBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },

  practiceToggle: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  practiceToggleText: { color: "#111827", fontWeight: "900" },

  resetBtn: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  resetTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },

  disabled: { opacity: 0.5 },

  /* DONE */
  doneBanner: {
    borderRadius: 22,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  doneBannerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doneBadgeText: { color: "#111827", fontWeight: "900" },
  doneStarsRow: { flexDirection: "row", gap: 4 },
  doneTitle: { marginTop: 12, color: "#fff", fontWeight: "900", fontSize: 28 },
  doneScoreRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },

  bigScorePill: {
    width: 96,
    height: 72,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  bigScoreText: { color: "#fff", fontWeight: "900", fontSize: 22 },
  doneScore: { color: "rgba(255,255,255,0.95)", fontWeight: "900", fontSize: 16 },

  miniBarOuter: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  miniBarInner: { height: "100%", borderRadius: 999, backgroundColor: "#FFD54A" },

  doneCardsRow: { marginTop: 14, flexDirection: "row", gap: 12 },
  smallCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  smallCardTitle: { color: "#111827", fontWeight: "900" },

  rewardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rewardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(47,107,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardText: { color: "#111827", fontWeight: "900" },

  targetsText: { color: "rgba(17,24,39,0.78)", fontWeight: "900" },
  targetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,183,3,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,183,3,0.30)",
  },
  targetPillText: { flex: 1, color: "#111827", fontWeight: "900" },

  donePracticeBtn: {
    marginTop: 14,
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  donePracticeText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  doneReplayBtn: {
    marginTop: 10,
    backgroundColor: "#5B35F2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  doneReplayText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});