import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Colors } from "../../lib/colors";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";

/* --------------------------------- Data ---------------------------------- */

type Card = { id: string; front: string; back: string; topic?: string };

const SEED: Card[] = [
  { id: "1", front: "What is 3/4 + 1/2?", back: "1¼ (or 5/4)", topic: "Fractions" },
  { id: "2", front: "Convert 0.75 to a fraction.", back: "3/4", topic: "Decimals" },
  { id: "3", front: "If x + 7 = 15, what is x?", back: "8", topic: "Algebra" },
  { id: "4", front: "Area of rectangle: 5cm × 3cm?", back: "15 cm²", topic: "Geometry" },
  { id: "5", front: "0.25 as a percentage?", back: "25%", topic: "Decimals" },
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
  }
> = {
  English: {
    title: "🧠 Flashcard Fun!",
    subtitle: "Tap to flip. Use buttons to navigate.",
    questionLbl: "Question",
    answerLbl: "Answer",
    topicLbl: "Topic",
    prev: "◀ Prev",
    showAnswer: "Show Answer",
    hideAnswer: "Hide Answer",
    next: "Next ▶",
    gotIt: "✔ I Got It",
    needsPractice: "✖ Needs Practice",
    correct: "Correct",
    incorrect: "Incorrect",
    completed: "Completed",
    reset: "Reset",
    finishedTitle: "Great job!",
    finishedMsg: "You've gone through all the flashcards!",
  },
  नेपाली: {
    title: "🧠 फ्ल्यासकार्ड रमाइलो!",
    subtitle: "फ्लिप गर्न ट्याप गर्नुहोस्। बटनले नेभिगेट गर्नुहोस्।",
    questionLbl: "प्रश्न",
    answerLbl: "उत्तर",
    topicLbl: "विषय",
    prev: "◀ अघिल्लो",
    showAnswer: "उत्तर देखाउनुहोस्",
    hideAnswer: "उत्तर लुकाउनुहोस्",
    next: "अर्को ▶",
    gotIt: "✔ मैले बुझें",
    needsPractice: "✖ अभ्यास चाहियो",
    correct: "सही",
    incorrect: "गलत",
    completed: "पूरा",
    reset: "रिसेट",
    finishedTitle: "धेरै राम्रो!",
    finishedMsg: "तपाईंले सबै फ्ल्यासकार्डहरू हेर्नुभयो!",
  },
  اردو: {
    title: "🧠 فلیش کارڈ مزہ!",
    subtitle: "پلٹنے کے لیے ٹیپ کریں۔ بٹن سے نیویگیٹ کریں۔",
    questionLbl: "سوال",
    answerLbl: "جواب",
    topicLbl: "موضوع",
    prev: "◀ پچھلا",
    showAnswer: "جواب دکھائیں",
    hideAnswer: "جواب چھپائیں",
    next: "اگلا ▶",
    gotIt: "✔ سمجھ گیا",
    needsPractice: "✖ مزید مشق",
    correct: "درست",
    incorrect: "غلط",
    completed: "مکمل",
    reset: "ری سیٹ",
    finishedTitle: "شاندار!",
    finishedMsg: "آپ نے تمام فلیش کارڈز دیکھ لیے!",
  },
  বাংলা: {
    title: "🧠 ফ্ল্যাশকার্ড মজা!",
    subtitle: "ফ্লিপ করতে ট্যাপ করুন। বাটন দিয়ে নেভিগেট করুন।",
    questionLbl: "প্রশ্ন",
    answerLbl: "উত্তর",
    topicLbl: "বিষয়",
    prev: "◀ পূর্ববর্তী",
    showAnswer: "উত্তর দেখুন",
    hideAnswer: "উত্তর লুকান",
    next: "পরবর্তী ▶",
    gotIt: "✔ বুঝেছি",
    needsPractice: "✖ আরো অনুশীলন",
    correct: "সঠিক",
    incorrect: "ভুল",
    completed: "সম্পন্ন",
    reset: "রিসেট",
    finishedTitle: "দারুণ!",
    finishedMsg: "আপনি সব ফ্ল্যাশকার্ড দেখে ফেলেছেন!",
  },
  हिन्दी: {
    title: "🧠 फ्लैशकार्ड मज़ा!",
    subtitle: "फ्लिप करने के लिए टैप करें। बटन से नेविगेट करें।",
    questionLbl: "प्रश्न",
    answerLbl: "उत्तर",
    topicLbl: "विषय",
    prev: "◀ पिछला",
    showAnswer: "उत्तर दिखाएँ",
    hideAnswer: "उत्तर छिपाएँ",
    next: "अगला ▶",
    gotIt: "✔ समझ गया/गई",
    needsPractice: "✖ और अभ्यास चाहिए",
    correct: "सही",
    incorrect: "गलत",
    completed: "पूर्ण",
    reset: "रीसेट",
    finishedTitle: "बहुत बढ़िया!",
    finishedMsg: "आपने सभी फ्लैशकार्ड देख लिए!",
  },
};

/* ------------------------------- Component -------------------------------- */

export default function Flashcards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  // language
  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL ? ({ writingDirection: "rtl" as "rtl", textAlign: "right" as const }) : undefined;

  // flip animation
  const flip = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);
  const rotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const rotateYBack = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  useEffect(() => {
    (async () => {
      // load language from onboarding
      const onboarding = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const savedLang = (onboarding?.language as Lang) || "English";
      setLang(LANGS.includes(savedLang) ? savedLang : "English");

      // load cards
      const stored = await loadJSON<Card[]>("cards", SEED);
      setCards(stored.length ? stored : SEED);
      resetSession(true);
    })();
  }, []);

  const currentCard = cards[current] ?? null;

  function animateFlip(toBack: boolean) {
    Animated.timing(flip, {
      toValue: toBack ? 1 : 0,
      duration: 400,
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
      Alert.alert(T.finishedTitle, T.finishedMsg);
      resetSession();
    }
  }
  function prevCard() {
    if (current > 0) {
      resetFlip();
      setCurrent((i) => i - 1);
    }
  }
  function mark(isCorrectAns: boolean) {
    if (!currentCard) return;
    if (!completed.includes(currentCard.id)) {
      setCompleted((s) => [...s, currentCard.id]);
      isCorrectAns ? setCorrect((n) => n + 1) : setIncorrect((n) => n + 1);
    }
    nextCard();
  }
  function resetSession(init = false) {
    setCurrent(0);
    setCompleted([]);
    setCorrect(0);
    setIncorrect(0);
    resetFlip(init);
  }

  const progressPct = useMemo(
    () => (cards.length ? Math.round((completed.length / cards.length) * 100) : 0),
    [completed.length, cards.length]
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Text style={[s.h1, rtl]}>{T.title}</Text>
        <Text style={[s.sub, rtl]}>{T.subtitle}</Text>
      </View>

      {/* Flip Card */}
      <View style={s.cardWrap}>
        {/* Front */}
        <Animated.View
          style={[
            s.card,
            { transform: [{ perspective: 1000 }, { rotateY }], backfaceVisibility: "hidden" as any },
          ]}
        >
          <Text style={[s.label, rtl]}>{T.questionLbl}</Text>
          <Text style={[s.big, rtl]}>{currentCard?.front ?? "—"}</Text>
          {!!currentCard?.topic && (
            <Text style={[s.topic, rtl]}>
              {T.topicLbl}: {currentCard.topic}
            </Text>
          )}
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            s.card,
            s.cardBack,
            { transform: [{ perspective: 1000 }, { rotateY: rotateYBack }], backfaceVisibility: "hidden" as any },
          ]}
        >
          <Text style={[s.label, rtl]}>{T.answerLbl}</Text>
          <Text style={[s.big, rtl]}>{currentCard?.back ?? "—"}</Text>
          {!!currentCard?.topic && (
            <Text style={[s.topic, rtl]}>
              {T.topicLbl}: {currentCard.topic}
            </Text>
          )}
        </Animated.View>
      </View>

      {/* Controls */}
      <View style={s.row}>
        <TouchableOpacity
          disabled={current === 0}
          onPress={prevCard}
          style={[s.btn, s.btnBlue, current === 0 && s.disabled]}
        >
          <Text style={[s.btnTxt, rtl]}>{T.prev}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onShowAnswer} style={[s.btn, s.btnPurple]}>
          <Text style={[s.btnTxt, rtl]}>{showBack ? T.hideAnswer : T.showAnswer}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={nextCard} style={[s.btn, s.btnBlue]}>
          <Text style={[s.btnTxt, rtl]}>{T.next}</Text>
        </TouchableOpacity>
      </View>

      {/* Correct / Incorrect */}
      {showBack && (
        <View style={[s.row, { marginTop: 8 }]}>
          <TouchableOpacity onPress={() => mark(true)} style={[s.btn, s.btnGreen, { flex: 1 }]}>
            <Text style={[s.btnTxt, rtl]}>{T.gotIt}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => mark(false)} style={[s.btn, s.btnRed, { flex: 1 }]}>
            <Text style={[s.btnTxt, rtl]}>{T.needsPractice}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={s.statsCard}>
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>{correct}</Text>
            <Text style={[s.statLbl, rtl]}>{T.correct}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statNum}>{incorrect}</Text>
            <Text style={[s.statLbl, rtl]}>{T.incorrect}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statNum}>{completed.length}</Text>
            <Text style={[s.statLbl, rtl]}>{T.completed}</Text>
          </View>
        </View>
        <View style={s.progressOuter}>
          <View style={[s.progressInner, { width: `${progressPct}%` }]} />
        </View>
        <View style={s.row}>
          <Text style={[s.progressText, rtl]}>{progressPct}%</Text>
          <TouchableOpacity onPress={() => resetSession()} style={[s.btn, s.btnGray, { flex: 0 }]}>
            <Text style={[s.btnTxt, rtl]}>{T.reset}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* -------------------------------- Styles --------------------------------- */

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0B1220" },
  h1: { fontSize: 24, fontWeight: "900", color: "white" },
  sub: { color: "#A5B4FC", marginTop: 4 },

  cardWrap: { height: 260, marginVertical: 12, alignItems: "center", justifyContent: "center" },
  card: {
    position: "absolute",
    width: "100%",
    maxWidth: 520,
    height: 240,
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(147, 51, 234, 0.5)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardBack: { borderColor: "rgba(59, 130, 246, 0.5)" },
  label: { color: "#fff", opacity: 0.9, fontWeight: "800", marginBottom: 6 },
  big: { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center" },
  topic: { position: "absolute", bottom: 12, right: 16, color: "#D1D5DB", fontSize: 12 },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 },

  btn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: "white", fontWeight: "800" },
  btnBlue: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  btnPurple: { backgroundColor: "#7C3AED", borderColor: "#8B5CF6" },
  btnGreen: { backgroundColor: "#16A34A", borderColor: "#22C55E" },
  btnRed: { backgroundColor: "#DC2626", borderColor: "#EF4444" },
  btnGray: { backgroundColor: "#374151", borderColor: "#6B7280" },
  disabled: { opacity: 0.5 },

  statsCard: {
    backgroundColor: "rgba(17,24,39,0.6)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: "#16A34A",
    marginTop: 12,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  stat: { alignItems: "center" },
  statNum: { fontSize: 22, color: "white", fontWeight: "900" },
  statLbl: { color: "#9CA3AF" },

  progressOuter: { height: 10, borderRadius: 999, backgroundColor: "#1F2937", overflow: "hidden" },
  progressInner: { height: "100%", backgroundColor: "#3B82F6" },
  progressText: { color: "white", fontWeight: "800" },
});