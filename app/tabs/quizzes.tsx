// app/(tabs)/quizzes.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { NextStepFooter } from "../../components/NextStepFooter";
import { generateQuizFromTranscript } from "../../lib/ai.local";
import { getQuizBankByUnit } from "../../lib/quizBank";
import { LESSON_INFO, getCombinedTranscriptByUnit, getLessonInfoByUnit, getQuizTopicByUnit } from "../../lib/lessonTranscripts";

/* ----------------------------- Types ---------------------------- */

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  explanation: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  type?: "AI Quiz" | "Practice";
};

type AnswerState = {
  selected: string | null;
  isAnswered: boolean;
};

/* ----------------------------- i18n ---------------------------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    qOf: (a: number, b: number) => string;
    score: string;
    aiQuiz: string;
    practice: string;
    explain: string;
    askAI: string;
    back: string;
    next: string;
    submit: string;
    finish: string;
    correct: string;
    incorrect: string;

    doneTitle: string;
    doneScore: (s: number, t: number) => string;
    playAgain: string;
    generateQuiz: string;
    changeUnit: string;
    practiceBtn: string;
    noWrong: string;

    rank: string;
    rankA: string;
    rankB: string;
    rankC: string;
    rankD: string;
    rewardsTitle: string;
    wrongTitle: string;

    selectUnit: string;
    cancel: string;
    thinkingTitle: string;
    thinkingSub: string;

    explainTitle: string;
    gotIt: string;

    lobbyTitle: string;
    lobbySub: string;
    chooseUnit: string;
    startChallenge: string;
    gameReady: string;
    unitLabel: string;
    challengeMode: string;
    emptyTitle: string;
    emptySub: string;
    selected: string;

    aiFailTitle: string;
    aiFailSub: string;
    tryAgain: string;

    preloadingHint: string;
  }
> = {
  English: {
    qOf: (a, b) => `Question ${a} / ${b}`,
    score: "Score",
    aiQuiz: "AI Quiz",
    practice: "Practice",
    explain: "Explain the Answer",
    askAI: "Ask Offklass AI",
    back: "Back",
    next: "Next",
    submit: "Submit",
    finish: "Finish",
    correct: "Correct",
    incorrect: "Incorrect",

    doneTitle: "Challenge Complete!",
    doneScore: (s, t) => `You scored ${s} / ${t}`,
    playAgain: "Play Again",
    generateQuiz: "Generate Quiz",
    changeUnit: "Choose Another Unit",
    practiceBtn: "Practice Wrong Questions",
    noWrong: "Perfect! No wrong questions 🎉",

    rank: "Rank",
    rankA: "Legend",
    rankB: "Pro",
    rankC: "Rising Star",
    rankD: "Keep Going",
    rewardsTitle: "Rewards",
    wrongTitle: "Practice Targets",

    selectUnit: "Select a Unit",
    cancel: "Cancel",
    thinkingTitle: "Offklass is building your challenge...",
    thinkingSub: "Creating quiz questions from your selected unit.",

    explainTitle: "Explanation",
    gotIt: "Got it!",

    lobbyTitle: "Quiz Adventure",
    lobbySub: "Choose a unit first, then press Start Challenge.",
    chooseUnit: "Choose Unit",
    startChallenge: "Start Challenge",
    gameReady: "Game Ready",
    unitLabel: "Unit",
    challengeMode: "Challenge Mode",
    emptyTitle: "No quiz yet",
    emptySub: "Select a unit to begin.",
    selected: "Selected",

    aiFailTitle: "AI quiz could not be generated",
    aiFailSub: "Please try again. Make sure the local AI model is ready.",
    tryAgain: "Try Again",

    preloadingHint: "Preparing your quiz in the background…",
  },

  नेपाली: {
    qOf: (a, b) => `प्रश्न ${a} / ${b}`,
    score: "अंक",
    aiQuiz: "AI क्विज",
    practice: "अभ्यास",
    explain: "उत्तर बुझाउनुहोस्",
    askAI: "Offklass AI लाई सोध्नुहोस्",
    back: "पछाडि",
    next: "अर्को",
    submit: "पेश गर्नुहोस्",
    finish: "समाप्त",
    correct: "सही",
    incorrect: "गलत",

    doneTitle: "च्यालेन्ज पूरा!",
    doneScore: (s, t) => `तपाईंको स्कोर ${s} / ${t}`,
    playAgain: "फेरि खेल्नुहोस्",
    generateQuiz: "नयाँ क्विज बनाउनुहोस्",
    changeUnit: "अर्को युनिट छान्नुहोस्",
    practiceBtn: "गलत प्रश्न अभ्यास गर्नुहोस्",
    noWrong: "धेरै राम्रो! कुनै गलत छैन 🎉",

    rank: "र्‍याङ्क",
    rankA: "लेजेंड",
    rankB: "प्रो",
    rankC: "राइजिङ स्टार",
    rankD: "जारी राख्नुहोस्",
    rewardsTitle: "इनाम",
    wrongTitle: "अभ्यास लक्ष्य",

    selectUnit: "युनिट छान्नुहोस्",
    cancel: "रद्द गर्नुहोस्",
    thinkingTitle: "Offklass च्यालेन्ज बनाउँदैछ...",
    thinkingSub: "छानिएको युनिटबाट क्विज तयार हुँदैछ।",

    explainTitle: "व्याख्या",
    gotIt: "बुझें!",

    lobbyTitle: "क्विज एडभेन्चर",
    lobbySub: "पहिले युनिट छान्नुहोस्, अनि Start Challenge थिच्नुहोस्।",
    chooseUnit: "युनिट छान्नुहोस्",
    startChallenge: "च्यालेन्ज सुरु गर्नुहोस्",
    gameReady: "खेल तयार",
    unitLabel: "युनिट",
    challengeMode: "च्यालेन्ज मोड",
    emptyTitle: "अहिले क्विज छैन",
    emptySub: "सुरु गर्न युनिट छान्नुहोस्।",
    selected: "छानिएको",

    aiFailTitle: "AI क्विज बनाउन सकिएन",
    aiFailSub: "कृपया फेरि प्रयास गर्नुहोस्। Local AI model तयार भएको सुनिश्चित गर्नुहोस्।",
    tryAgain: "फेरि प्रयास गर्नुहोस्",

    preloadingHint: "पृष्ठभूमिमा क्विज तयार हुँदैछ…",
  },

  اردو: {
    qOf: (a, b) => `سوال ${a} / ${b}`,
    score: "اسکور",
    aiQuiz: "AI کوئز",
    practice: "پریکٹس",
    explain: "جواب سمجھائیں",
    askAI: "Offklass AI سے پوچھیں",
    back: "واپس",
    next: "اگلا",
    submit: "جمع کریں",
    finish: "ختم",
    correct: "درست",
    incorrect: "غلط",

    doneTitle: "چیلنج مکمل!",
    doneScore: (s, t) => `آپ کا اسکور ${s} / ${t}`,
    playAgain: "دوبارہ کھیلیں",
    generateQuiz: "نیا کوئز بنائیں",
    changeUnit: "دوسرا یونٹ منتخب کریں",
    practiceBtn: "غلط سوالات کی مشق",
    noWrong: "زبردست! کوئی غلط نہیں 🎉",

    rank: "رینک",
    rankA: "لیجنڈ",
    rankB: "پرو",
    rankC: "رائزنگ اسٹار",
    rankD: "جاری رکھیں",
    rewardsTitle: "انعامات",
    wrongTitle: "پریکٹس ہدف",

    selectUnit: "یونٹ منتخب کریں",
    cancel: "منسوخ",
    thinkingTitle: "Offklass آپ کا چیلنج بنا رہا ہے...",
    thinkingSub: "منتخب یونٹ سے کوئز تیار ہو رہا ہے۔",

    explainTitle: "وضاحت",
    gotIt: "سمجھ گیا!",

    lobbyTitle: "کوئز ایڈونچر",
    lobbySub: "پہلے یونٹ منتخب کریں، پھر Start Challenge دبائیں۔",
    chooseUnit: "یونٹ منتخب کریں",
    startChallenge: "چیلنج شروع کریں",
    gameReady: "گیم تیار",
    unitLabel: "یونٹ",
    challengeMode: "چیلنج موڈ",
    emptyTitle: "ابھی کوئز نہیں",
    emptySub: "شروع کرنے کے لیے یونٹ منتخب کریں۔",
    selected: "منتخب",

    aiFailTitle: "AI کوئز تیار نہیں ہو سکا",
    aiFailSub: "براہ کرم دوبارہ کوشش کریں۔ Local AI model ready ہونا چاہیے۔",
    tryAgain: "دوبارہ کوشش کریں",

    preloadingHint: "پس منظر میں کوئز تیار ہو رہا ہے…",
  },

  বাংলা: {
    qOf: (a, b) => `প্রশ্ন ${a} / ${b}`,
    score: "স্কোর",
    aiQuiz: "AI কুইজ",
    practice: "প্র্যাকটিস",
    explain: "উত্তর ব্যাখ্যা করুন",
    askAI: "Offklass AI কে জিজ্ঞাসা করুন",
    back: "ফিরে যান",
    next: "পরবর্তী",
    submit: "জমা দিন",
    finish: "শেষ",
    correct: "সঠিক",
    incorrect: "ভুল",

    doneTitle: "চ্যালেঞ্জ শেষ!",
    doneScore: (s, t) => `আপনার স্কোর ${s} / ${t}`,
    playAgain: "আবার খেলুন",
    generateQuiz: "নতুন কুইজ তৈরি করো",
    changeUnit: "অন্য ইউনিট বেছে নাও",
    practiceBtn: "ভুল প্রশ্ন প্র্যাকটিস",
    noWrong: "দারুণ! কোনো ভুল নেই 🎉",

    rank: "র‍্যাঙ্ক",
    rankA: "লেজেন্ড",
    rankB: "প্রো",
    rankC: "রাইজিং স্টার",
    rankD: "চালিয়ে যান",
    rewardsTitle: "রিওয়ার্ড",
    wrongTitle: "প্র্যাকটিস টার্গেট",

    selectUnit: "ইউনিট নির্বাচন করুন",
    cancel: "বাতিল",
    thinkingTitle: "Offklass তোমার চ্যালেঞ্জ বানাচ্ছে...",
    thinkingSub: "নির্বাচিত ইউনিট থেকে কুইজ তৈরি হচ্ছে।",

    explainTitle: "ব্যাখ্যা",
    gotIt: "বুঝেছি!",

    lobbyTitle: "কুইজ অ্যাডভেঞ্চার",
    lobbySub: "আগে একটি ইউনিট বেছে নাও, তারপর Start Challenge চাপো।",
    chooseUnit: "ইউনিট বেছে নাও",
    startChallenge: "চ্যালেঞ্জ শুরু করো",
    gameReady: "গেম রেডি",
    unitLabel: "ইউনিট",
    challengeMode: "চ্যালেঞ্জ মোড",
    emptyTitle: "এখনো কুইজ নেই",
    emptySub: "শুরু করতে একটি ইউনিট বেছে নাও।",
    selected: "নির্বাচিত",

    aiFailTitle: "AI কুইজ তৈরি করা যায়নি",
    aiFailSub: "আবার চেষ্টা করো। Local AI model ready আছে কিনা দেখে নাও।",
    tryAgain: "আবার চেষ্টা করো",

    preloadingHint: "ব্যাকগ্রাউন্ডে কুইজ তৈরি হচ্ছে…",
  },

  हिन्दी: {
    qOf: (a, b) => `प्रश्न ${a} / ${b}`,
    score: "स्कोर",
    aiQuiz: "AI Quiz",
    practice: "Practice",
    explain: "Answer समझाओ",
    askAI: "Ask Offklass AI",
    back: "Back",
    next: "Next",
    submit: "Submit",
    finish: "Finish",
    correct: "Correct",
    incorrect: "Incorrect",

    doneTitle: "Challenge Complete!",
    doneScore: (s, t) => `You scored ${s} / ${t}`,
    playAgain: "Play Again",
    generateQuiz: "Generate Quiz",
    changeUnit: "Choose Another Unit",
    practiceBtn: "Practice Wrong Questions",
    noWrong: "Perfect! No wrong questions 🎉",

    rank: "Rank",
    rankA: "Legend",
    rankB: "Pro",
    rankC: "Rising Star",
    rankD: "Keep Going",
    rewardsTitle: "Rewards",
    wrongTitle: "Practice Targets",

    selectUnit: "Select a Unit",
    cancel: "Cancel",
    thinkingTitle: "Offklass is building your challenge...",
    thinkingSub: "Creating quiz questions from your selected unit.",

    explainTitle: "Explanation",
    gotIt: "Got it!",

    lobbyTitle: "Quiz Adventure",
    lobbySub: "Choose a unit first, then press Start Challenge.",
    chooseUnit: "Choose Unit",
    startChallenge: "Start Challenge",
    gameReady: "Game Ready",
    unitLabel: "Unit",
    challengeMode: "Challenge Mode",
    emptyTitle: "No quiz yet",
    emptySub: "Select a unit to begin.",
    selected: "Selected",

    aiFailTitle: "AI quiz could not be generated",
    aiFailSub: "Please try again. Make sure the local AI model is ready.",
    tryAgain: "Try Again",

    preloadingHint: "बैकग्राउंड में क्विज़ तैयार हो रहा है…",
  },
};

/* ----------------------------- helpers ---------------------------- */

const BG_TOP = "#BDE6FF";
const BG_MID = "#FFF2B8";
const BG_BOT = "#E7D7FF";

const CARD = "rgba(255,255,255,0.94)";
const INK = "#111827";
const REQUIRED_QUESTION_COUNT = 10;

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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOption(value: unknown) {
  return normalizeText(value)
    .replace(/^[A-D][\)\.:\-\s]+/i, "")
    .trim();
}

function dedupeStrings(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function resolveCorrectAnswer(options: string[], rawCorrectAnswer: string): string | null {
  if (!rawCorrectAnswer || options.length === 0) return null;

  const exact = options.find(
    (opt) => opt.toLowerCase() === rawCorrectAnswer.toLowerCase()
  );
  if (exact) return exact;

  const contains = options.find(
    (opt) =>
      rawCorrectAnswer.toLowerCase().includes(opt.toLowerCase()) ||
      opt.toLowerCase().includes(rawCorrectAnswer.toLowerCase())
  );
  if (contains) return contains;

  const first = rawCorrectAnswer.charAt(0).toUpperCase();
  if (first === "A") return options[0] ?? null;
  if (first === "B") return options[1] ?? null;
  if (first === "C") return options[2] ?? null;
  if (first === "D") return options[3] ?? null;

  return null;
}

function sanitizeGeneratedQuiz(raw: any[], unit: string): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];

  const cleaned = raw
    .map((g: any, idx: number) => {
      const question = normalizeText(g?.question);
      const explanation =
        normalizeText(g?.explanation) ||
        `This answer comes from the lesson content in ${unit}.`;

      let options = Array.isArray(g?.options)
        ? g.options.map(normalizeOption).filter(Boolean)
        : [];

      options = dedupeStrings(options);

      const rawCorrectAnswer = normalizeText(g?.correctAnswer);
      let correctAnswer = resolveCorrectAnswer(options, rawCorrectAnswer);

      if (!question) return null;
      if (options.length < 4) return null;

      options = options.slice(0, 4);

      if (!correctAnswer) {
        correctAnswer = resolveCorrectAnswer(options, rawCorrectAnswer);
      }

      if (!correctAnswer) return null;

      if (!options.some((opt: string) => opt.toLowerCase() === correctAnswer!.toLowerCase())) {
        const replaced = dedupeStrings([correctAnswer, ...options]).slice(0, 4);
        options = replaced;

        if (!options.some((opt: string) => opt.toLowerCase() === correctAnswer!.toLowerCase())) {
          return null;
        }
      }

      correctAnswer =
        options.find((opt: string) => opt.toLowerCase() === correctAnswer!.toLowerCase()) ??
        correctAnswer;

      const topic = normalizeText(g?.topic) || unit;

      return {
        id: idx + 1,
        question,
        options: shuffle(options),
        correctAnswer,
        topic,
        explanation,
        difficulty:
          g?.difficulty === "Easy" ||
          g?.difficulty === "Medium" ||
          g?.difficulty === "Hard"
            ? g.difficulty
            : "Medium",
        type: "AI Quiz" as const,
      };
    })
    .filter(Boolean) as QuizQuestion[];

  const uniqueByQuestion: QuizQuestion[] = [];
  const seenQuestions = new Set<string>();

  for (const item of cleaned) {
    const key = item.question.toLowerCase();
    if (seenQuestions.has(key)) continue;
    seenQuestions.add(key);
    uniqueByQuestion.push(item);
  }

  return uniqueByQuestion.slice(0, REQUIRED_QUESTION_COUNT);
}

function mapBankQuestionsToQuiz(
  bankQuestions: ReturnType<typeof getQuizBankByUnit>
): QuizQuestion[] {
  return bankQuestions.slice(0, REQUIRED_QUESTION_COUNT).map((q, index) => ({
    id: index + 1,
    question: q.question,
    options: shuffle([...q.options]),
    correctAnswer: q.correctAnswer,
    topic: q.topic,
    explanation: q.explanation,
    difficulty: q.difficulty ?? "Medium",
    type: q.type ?? "AI Quiz",
  }));
}

function getFallbackQuizForUnit(unit: string): QuizQuestion[] {
  return mapBankQuestionsToQuiz(getQuizBankByUnit(unit));
}

function buildCombinedTranscriptForUnit(unit: string) {
  const lessons = getLessonInfoByUnit(unit);
  const combinedTranscript = getCombinedTranscriptByUnit(unit);
  const topicLabel = getQuizTopicByUnit(unit);

  return {
    lessons,
    combinedTranscript,
    topicLabel,
  };
}

/* ----------------------------- screen ---------------------------- */

export default function Quizzes() {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
  const isTablet = width >= 900;

  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang], [lang]);

  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({ writingDirection: "rtl" as const, textAlign: "right" as const } as const)
    : undefined;

  const [mode, setMode] = useState<"quiz" | "practice">("quiz");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [done, setDone] = useState(false);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [showExplainSheet, setShowExplainSheet] = useState(false);

  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  /* ⚡ Background pre-generation state */
  const [pregeneratedQuiz, setPregeneratedQuiz] = useState<QuizQuestion[] | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadCancelRef = useRef(false);
  const preloadUnitRef = useRef<string | null>(null);
  const quizCacheRef = useRef<Record<string, QuizQuestion[]>>({});

  const units = useMemo(() => Array.from(new Set(LESSON_INFO.map((x) => x.unit))), []);

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const l = (saved?.language as Lang) || "English";
      setLang(LANGS.includes(l) ? l : "English");
    })();
  }, []);

  /* ⚡ Pre-generate quiz in background as soon as user selects a unit */
  useEffect(() => {
    if (!selectedUnit) {
      setPregeneratedQuiz(null);
      setIsPreloading(false);
      return;
    }

    const cachedQuiz = quizCacheRef.current[selectedUnit];
    if (cachedQuiz && cachedQuiz.length > 0) {
      setPregeneratedQuiz(cachedQuiz);
      setIsPreloading(false);
      preloadUnitRef.current = selectedUnit;
      return;
    }

    // Don't re-preload if we already have a quiz for this unit
    if (preloadUnitRef.current === selectedUnit && pregeneratedQuiz !== null) {
      return;
    }

    preloadCancelRef.current = true; // cancel any in-flight preload
    setPregeneratedQuiz(null);
    setIsPreloading(true);
    setGenerationError(null);

    const thisUnit = selectedUnit;
    preloadCancelRef.current = false;
    preloadUnitRef.current = thisUnit;

    (async () => {
      try {
        const result = await tryGenerateQuestionsForUnit(thisUnit);
        if (preloadCancelRef.current || preloadUnitRef.current !== thisUnit) return;

        if (result.length > 0) {
          quizCacheRef.current[thisUnit] = result;
          setPregeneratedQuiz(result);
        } else {
          setPregeneratedQuiz(null);
        }
      } catch (err) {
        console.error("Background preload error:", err);
        if (preloadCancelRef.current || preloadUnitRef.current !== thisUnit) return;
        setPregeneratedQuiz(null);
      } finally {
        if (preloadUnitRef.current === thisUnit) {
          setIsPreloading(false);
        }
      }
    })();

    return () => {
      preloadCancelRef.current = true;
    };
  }, [selectedUnit]);

  const total = questions.length;
  const q = questions[current];

  const a: AnswerState = answers[q?.id ?? -1] ?? { selected: null, isAnswered: false };
  const selected = a.selected;
  const isAnswered = a.isAnswered;

  const score = useMemo(() => {
    return questions.reduce((acc, qq) => {
      const st = answers[qq.id];
      if (st?.isAnswered && st.selected === qq.correctAnswer) return acc + 1;
      return acc;
    }, 0);
  }, [answers, questions]);

  const answeredCount = useMemo(() => {
    return questions.reduce((acc, qq) => (answers[qq.id]?.isAnswered ? acc + 1 : acc), 0);
  }, [answers, questions]);

  const progressPct = useMemo(() => {
    return clampPct(Math.round((answeredCount / Math.max(1, total)) * 100));
  }, [answeredCount, total]);

  const answeredCorrect = !!q && isAnswered && selected === q.correctAnswer;

  const wrongQuestions = useMemo(() => {
    return questions.filter((qq) => wrongIds.includes(qq.id));
  }, [questions, wrongIds]);

  const targetTopics = useMemo(() => {
    return Array.from(new Set(wrongQuestions.map((x) => x.topic))).slice(0, 3);
  }, [wrongQuestions]);

  const resultPct = total === 0 ? 0 : Math.round((score / total) * 100);
  const starCount = starsForPct(resultPct);

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

  const goAskAI = () => {
    router.push({
      pathname: "/tabs/ai" as any,
      params: {
        question: q?.question ?? "",
        userAnswer: selected ?? "",
        correctAnswer: q?.correctAnswer ?? "",
        topic: q?.topic ?? "",
      },
    });
  };

  const resetQuizState = () => {
    setCurrent(0);
    setAnswers({});
    setWrongIds([]);
    setDone(false);
    setShowExplainSheet(false);
  };

  const selectOption = (opt: string) => {
    if (done || isAnswered || !q) return;

    setAnswers((prev) => ({
      ...prev,
      [q.id]: { selected: opt, isAnswered: false },
    }));
  };

  const submit = () => {
    if (done || !q || selected == null || isAnswered) return;

    const isWrong = selected !== q.correctAnswer;

    setAnswers((prev) => ({
      ...prev,
      [q.id]: { selected, isAnswered: true },
    }));

    if (isWrong) {
      setWrongIds((ids) => (ids.includes(q.id) ? ids : [...ids, q.id]));
    }
  };

  const goNextOrFinish = () => {
    if (done || !isAnswered) return;

    if (current < total - 1) {
      setCurrent((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  const backQuestion = () => {
    if (done) return;

    if (current > 0) {
      setCurrent((i) => Math.max(0, i - 1));
      return;
    }

    router.back();
  };

  const explainNow = () => {
    if (!q) return;
    setShowExplainSheet(true);
  };

  const startPracticeWrong = () => {
    if (wrongQuestions.length === 0) return;

    setMode("practice");
    setQuestions(
      wrongQuestions.map((qq, idx) => ({
        ...qq,
        id: idx + 1,
        type: "Practice",
      }))
    );
    resetQuizState();
  };

  async function tryGenerateQuestionsForUnit(unit: string): Promise<QuizQuestion[]> {
    const { lessons, combinedTranscript, topicLabel } = buildCombinedTranscriptForUnit(unit);
    const fallbackQuiz = getFallbackQuizForUnit(unit);

    if (!lessons.length || !combinedTranscript.trim()) {
      return fallbackQuiz;
    }

    try {
      const generated = await generateQuizFromTranscript(
        combinedTranscript,
        unit,
        topicLabel
      );

      const sanitized = sanitizeGeneratedQuiz(generated, unit);

      console.log("Sanitized quiz count:", sanitized.length);

      if (sanitized.length >= REQUIRED_QUESTION_COUNT) {
        return sanitized.slice(0, REQUIRED_QUESTION_COUNT);
      }

      if (sanitized.length > 0) {
        const fallbackByQuestion = new Map(
          fallbackQuiz.map((item) => [item.question.trim().toLowerCase(), item])
        );

        for (const item of sanitized) {
          fallbackByQuestion.delete(item.question.trim().toLowerCase());
        }

        const toppedUp = [...sanitized, ...Array.from(fallbackByQuestion.values())].slice(
          0,
          REQUIRED_QUESTION_COUNT
        );

        if (toppedUp.length > 0) {
          return toppedUp;
        }
      }
    } catch (error) {
      console.error("Quiz generation failed for unit:", unit, error);
    }

    return fallbackQuiz;
  }

  /* ⚡ Start challenge — uses pregenerated quiz if available (near-instant) */
  async function startChallengeForSelectedUnit() {
    if (!selectedUnit) return;

    resetQuizState();
    setQuestions([]);
    setGenerationError(null);

    const cachedQuiz = selectedUnit ? quizCacheRef.current[selectedUnit] : null;

    // ⚡ If background preload already finished, use it immediately
    if ((cachedQuiz && cachedQuiz.length > 0) || (pregeneratedQuiz && pregeneratedQuiz.length > 0)) {
      const readyQuiz = cachedQuiz && cachedQuiz.length > 0 ? cachedQuiz : pregeneratedQuiz!;
      setMode("quiz");
      setQuestions(readyQuiz);
      setCurrent(0);
      // Clear pregenerated so next "Generate Quiz" forces fresh generation
      setPregeneratedQuiz(null);
      preloadUnitRef.current = null;
      return;
    }

    // Otherwise generate now (fallback if preload is still running or failed)
    setIsGeneratingQuiz(true);

    try {
      const finalQuestions = await tryGenerateQuestionsForUnit(selectedUnit);

      if (finalQuestions.length === 0) {
        setGenerationError("AI returned no valid quiz questions.");
        setQuestions([]);
        return;
      }

      if (selectedUnit && finalQuestions.length > 0) {
        quizCacheRef.current[selectedUnit] = finalQuestions;
      }
      setMode("quiz");
      setQuestions(finalQuestions);
      setCurrent(0);
    } catch (err) {
      console.error("Start challenge error:", err);
      setGenerationError("Failed to generate quiz.");
      setQuestions([]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  const restartQuiz = async () => {
    if (!selectedUnit) {
      setQuestions([]);
      resetQuizState();
      return;
    }

    // Force fresh generation (clear any preloaded quiz)
    if (selectedUnit) {
      delete quizCacheRef.current[selectedUnit];
    }
    setPregeneratedQuiz(null);
    preloadUnitRef.current = null;

    setIsGeneratingQuiz(true);
    resetQuizState();
    setQuestions([]);
    setGenerationError(null);

    try {
      const finalQuestions = await tryGenerateQuestionsForUnit(selectedUnit);

      if (finalQuestions.length === 0) {
        setGenerationError("AI returned no valid quiz questions.");
        setQuestions([]);
        return;
      }

      if (selectedUnit && finalQuestions.length > 0) {
        quizCacheRef.current[selectedUnit] = finalQuestions;
      }
      setMode("quiz");
      setQuestions(finalQuestions);
      setCurrent(0);
    } catch (err) {
      console.error("Restart quiz error:", err);
      setGenerationError("Failed to generate quiz.");
      setQuestions([]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const openUnitPickerFromResults = () => {
    resetQuizState();
    setQuestions([]);
    setDone(false);
    setGenerationError(null);
    setPregeneratedQuiz(null);
    preloadUnitRef.current = null;
    setShowUnitSelector(true);
  };

  const hasQuiz = questions.length > 0;
  const headerTagType = q?.type ?? (mode === "practice" ? T.practice : T.aiQuiz);
  const headerTagDiff = q?.difficulty ?? "Medium";

  /* ⚡ Determine if the Start button should be enabled */
  const canStartInstantly = !!(pregeneratedQuiz && pregeneratedQuiz.length > 0);
  const canStartChallenge = !!selectedUnit && (!isGeneratingQuiz || canStartInstantly);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={[BG_TOP, BG_MID, BG_BOT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.bgDecorWrap}>
        <View style={[styles.blob, styles.blobA]} />
        <View style={[styles.blob, styles.blobB]} />
        <View style={[styles.blob, styles.blobC]} />
        <View style={[styles.sparkleDot, { top: 26, right: 18, opacity: 0.9 }]} />
        <View style={[styles.sparkleDot, { top: 80, left: 22, opacity: 0.6 }]} />
        <View style={[styles.sparkleDot, { bottom: 90, right: 30, opacity: 0.55 }]} />
      </View>

      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(16, insets.bottom + 16),
              paddingHorizontal: isTablet ? 22 : 14,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.shell}>
            <View style={styles.quizCard}>
              <View style={styles.funHeaderRow}>
                <View style={styles.funHeaderLeft}>
                  <LinearGradient
                    colors={["#5B35F2", "#FF7A59"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.funIcon}
                  >
                    <Ionicons name="game-controller" size={18} color="#fff" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.funTitle}>Offklass Quiz Adventure</Text>
                    <Text style={styles.funSub}>{T.challengeMode} 🎯</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.funBackBtn, pressed && { opacity: 0.9 }]}
                >
                  <Ionicons name="arrow-back" size={18} color={INK} />
                </Pressable>
              </View>

              {!hasQuiz && !isGeneratingQuiz ? (
                <View style={styles.lobbyWrap}>
                  <LinearGradient colors={["#FFFFFF", "#F8F4FF"]} style={styles.lobbyHero}>
                    <View style={styles.lobbyTopRow}>
                      <View style={styles.lobbyBadge}>
                        <Ionicons name="sparkles" size={16} color="#5B35F2" />
                        <Text style={styles.lobbyBadgeText}>{T.gameReady}</Text>
                      </View>
                    </View>

                    <View style={styles.lobbyHeroMain}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.lobbyTitle, rtl]}>{T.lobbyTitle}</Text>
                        <Text style={[styles.lobbySub, rtl]}>{T.lobbySub}</Text>

                        <View style={styles.unitPreviewPill}>
                          <Ionicons name="book-outline" size={16} color="#111827" />
                          <Text style={styles.unitPreviewText}>
                            {selectedUnit
                              ? `${T.selected}: ${selectedUnit}`
                              : `${T.unitLabel}: —`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.lobbyMascotWrap}>
                        <View style={styles.lobbyMascotBig}>
                          <Ionicons name="rocket-outline" size={34} color="#5B35F2" />
                        </View>
                        <View style={styles.lobbyMascotSmall}>
                          <Ionicons name="star" size={14} color="#FF7A59" />
                        </View>
                      </View>
                    </View>
                  </LinearGradient>

                  <View style={styles.lobbyActions}>
                    <Pressable
                      onPress={() => setShowUnitSelector(true)}
                      style={({ pressed }) => [
                        styles.lobbyUnitBtn,
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      <Ionicons name="library-outline" size={18} color="#111827" />
                      <Text style={styles.lobbyUnitBtnText}>{T.chooseUnit}</Text>
                    </Pressable>

                    <Pressable
                      onPress={startChallengeForSelectedUnit}
                      disabled={!canStartChallenge}
                      style={({ pressed }) => [
                        styles.lobbyStartBtn,
                        canStartChallenge && styles.lobbyStartBtnReady,
                        (!canStartChallenge || pressed) && {
                          opacity: !canStartChallenge ? 0.55 : 0.92,
                        },
                      ]}
                    >
                      {isPreloading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="play" size={18} color="#fff" />
                      )}
                      <Text style={styles.lobbyStartBtnText}>{T.startChallenge}</Text>
                    </Pressable>
                  </View>

                  {/* ⚡ Background preloading hint */}
                  {isPreloading && !generationError && (
                    <View style={styles.preloadHintCard}>
                      <ActivityIndicator size="small" color="#5B35F2" />
                      <Text style={styles.preloadHintText}>{T.preloadingHint}</Text>
                    </View>
                  )}

                  {/* ⚡ Ready indicator */}
                  {!isPreloading && pregeneratedQuiz && pregeneratedQuiz.length > 0 && !generationError && (
                    <View style={styles.readyHintCard}>
                      <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                      <Text style={styles.readyHintText}>Quiz ready! Tap Start Challenge.</Text>
                    </View>
                  )}

                  {generationError ? (
                    <View style={styles.errorCard}>
                      <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.errorTitle}>{T.aiFailTitle}</Text>
                        <Text style={styles.errorSub}>
                          {generationError || T.aiFailSub}
                        </Text>
                      </View>
                    </View>
                  ) : !isPreloading && !(pregeneratedQuiz && pregeneratedQuiz.length > 0) ? (
                    <View style={styles.emptyHintCard}>
                      <Ionicons name="bulb-outline" size={18} color="#5B35F2" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.emptyHintTitle}>{T.emptyTitle}</Text>
                        <Text style={styles.emptyHintSub}>{T.emptySub}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : isGeneratingQuiz ? (
                <View style={styles.thinkingCard}>
                  <ActivityIndicator size="large" color="#5B35F2" />
                  <Text style={[styles.thinkingTitle, rtl]}>{T.thinkingTitle}</Text>
                  <Text style={[styles.thinkingSub, rtl]}>{T.thinkingSub}</Text>
                </View>
              ) : !done ? (
                <>
                  <View style={styles.topRow}>
                    <Text style={[styles.qOf, rtl]}>{T.qOf(current + 1, total)}</Text>
                    <Text style={[styles.score, rtl]}>
                      {T.score}: <Text style={styles.scoreNum}>{score}</Text> / {total}
                    </Text>
                  </View>

                  <View style={styles.progressOuter}>
                    <LinearGradient
                      colors={["#5B35F2", "#56CCF2", "#22C55E"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressInnerGradient, { width: `${progressPct}%` }]}
                    />
                  </View>

                  <View style={styles.quizTopTools}>
                    <View style={styles.tagsRow}>
                      <View style={[styles.tag, styles.tagGreen]}>
                        <Text style={styles.tagTextGreen}>
                          {headerTagType === "AI Quiz" ? T.aiQuiz : headerTagType}
                        </Text>
                      </View>

                      <View style={[styles.tag, styles.tagPurple]}>
                        <Text style={styles.tagTextPurple}>{headerTagDiff}</Text>
                      </View>
                    </View>
                  </View>

                  {!!selectedUnit && (
                    <View style={styles.currentUnitChip}>
                      <Ionicons name="bookmarks-outline" size={14} color="#111827" />
                      <Text style={styles.currentUnitChipText}>{selectedUnit}</Text>
                    </View>
                  )}

                  <Text style={[styles.question, rtl]}>{q?.question ?? "—"}</Text>

                  {!!q && (
                    <View style={{ gap: 12 }}>
                      {q.options.map((opt, idx) => {
                        const isSel = selected === opt;
                        const isCorrect = opt === q.correctAnswer;

                        let boxStyle = styles.optionIdle;
                        let textStyle = styles.optionTextIdle;
                        let rightIcon: null | "checkmark-circle" | "close-circle" = null;

                        if (!isAnswered) {
                          if (isSel) {
                            boxStyle = styles.optionSelected;
                            textStyle = styles.optionTextSelected;
                          }
                        } else {
                          if (isCorrect) {
                            boxStyle = styles.optionCorrect;
                            textStyle = styles.optionTextSelected;
                            rightIcon = "checkmark-circle";
                          } else if (isSel && !isCorrect) {
                            boxStyle = styles.optionWrong;
                            textStyle = styles.optionTextSelected;
                            rightIcon = "close-circle";
                          } else {
                            boxStyle = styles.optionIdleAnswered;
                            textStyle = styles.optionTextIdleAnswered;
                          }
                        }

                        return (
                          <TouchableOpacity
                            key={`${opt}-${idx}`}
                            activeOpacity={0.85}
                            disabled={isAnswered}
                            onPress={() => selectOption(opt)}
                            style={[styles.optionBase, boxStyle]}
                          >
                            <View style={styles.optionBadge}>
                              <Text style={styles.optionBadgeText}>
                                {String.fromCharCode(65 + idx)}
                              </Text>
                            </View>

                            <Text style={[styles.optionTextBase, textStyle, rtl]}>{opt}</Text>

                            {!!rightIcon && (
                              <Ionicons
                                name={rightIcon}
                                size={22}
                                color={rightIcon === "checkmark-circle" ? "#16A34A" : "#DC2626"}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {!!q && isAnswered && (
                    <View
                      style={[
                        styles.feedbackBanner,
                        answeredCorrect ? styles.bannerOk : styles.bannerBad,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bannerText,
                          answeredCorrect ? { color: "#16A34A" } : { color: "#DC2626" },
                          rtl,
                        ]}
                      >
                        {answeredCorrect ? T.correct : T.incorrect}
                      </Text>
                    </View>
                  )}

                  <View style={{ marginTop: 14, gap: 10 }}>
                    <Pressable
                      onPress={explainNow}
                      style={({ pressed }) => [styles.hintBtn, pressed && { opacity: 0.92 }]}
                    >
                      <Ionicons name="bulb" size={18} color="#111827" />
                      <Text style={styles.hintBtnText}>{T.explain}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#111827" />
                    </Pressable>

                    <Pressable
                      onPress={goAskAI}
                      style={({ pressed }) => [styles.askAIBtn, pressed && { opacity: 0.92 }]}
                    >
                      <Ionicons name="sparkles" size={18} color="#fff" />
                      <Text style={styles.askAIBtnText}>{T.askAI}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.bottomRow}>
                    <Pressable
                      onPress={backQuestion}
                      style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.9 }]}
                    >
                      <Ionicons name="arrow-back" size={18} color={INK} />
                      <Text style={styles.btnGhostText}>{T.back}</Text>
                    </Pressable>

                    {!isAnswered ? (
                      <Pressable
                        onPress={submit}
                        disabled={!selected}
                        style={({ pressed }) => [
                          styles.btnPrimary,
                          (!selected || pressed) && { opacity: !selected ? 0.55 : 0.92 },
                        ]}
                      >
                        <Text style={styles.btnPrimaryText}>{T.submit}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={goNextOrFinish}
                        style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.92 }]}
                      >
                        <Text style={styles.btnPrimaryText}>
                          {current < total - 1 ? T.next : T.finish}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.doneWrap}>
                  <LinearGradient
                    colors={["#FF7A59", "#FFD54A", "#56CCF2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.doneBanner}
                  >
                    <View style={styles.doneBannerTop}>
                      <View style={styles.doneBadge}>
                        <Ionicons name={rankIcon as any} size={18} color="#111827" />
                        <Text style={styles.doneBadgeText}>
                          {T.rank}: {rankLabel}
                        </Text>
                      </View>

                      <View style={styles.doneStarsRow}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < starCount ? "star" : "star-outline"}
                            size={18}
                            color="#111827"
                          />
                        ))}
                      </View>
                    </View>

                    <Text style={[styles.doneTitle, rtl]}>{T.doneTitle}</Text>

                    <View style={styles.doneScoreRow}>
                      <View style={styles.bigScorePill}>
                        <Text style={styles.bigScoreText}>{resultPct}%</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.doneScore, rtl]}>{T.doneScore(score, total)}</Text>

                        <View style={styles.miniBarOuter}>
                          <View style={[styles.miniBarInner, { width: `${clampPct(resultPct)}%` }]} />
                        </View>
                      </View>
                    </View>

                    <View style={styles.confettiRow}>
                      <View style={[styles.dot, { opacity: 0.95 }]} />
                      <View style={[styles.dot, { opacity: 0.7 }]} />
                      <View style={[styles.dot, { opacity: 0.55 }]} />
                      <View style={[styles.dot, { opacity: 0.35 }]} />
                    </View>
                  </LinearGradient>

                  <View style={styles.doneCardsRow}>
                    <View style={styles.smallCard}>
                      <Text style={styles.smallCardTitle}>{T.rewardsTitle}</Text>
                      <View style={{ gap: 10, marginTop: 10 }}>
                        <View style={styles.rewardRow}>
                          <View style={styles.rewardIcon}>
                            <Ionicons name="flash" size={16} color="#2F6BFF" />
                          </View>
                          <Text style={styles.rewardText}>+ {score * 10} XP</Text>
                        </View>

                        <View style={styles.rewardRow}>
                          <View style={styles.rewardIcon}>
                            <Ionicons name="diamond" size={16} color="#5B35F2" />
                          </View>
                          <Text style={styles.rewardText}>Brain Power Boost</Text>
                        </View>

                        <View style={styles.rewardRow}>
                          <View style={styles.rewardIcon}>
                            <Ionicons name="happy" size={16} color="#16A34A" />
                          </View>
                          <Text style={styles.rewardText}>Great Job!</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.smallCard}>
                      <Text style={styles.smallCardTitle}>{T.wrongTitle}</Text>
                      <View style={{ marginTop: 10 }}>
                        {mode === "quiz" ? (
                          wrongIds.length === 0 ? (
                            <Text style={styles.targetsText}>{T.noWrong}</Text>
                          ) : (
                            <>
                              <Text style={styles.targetsText}>
                                {wrongIds.length} questions to practice
                              </Text>
                              <View style={{ marginTop: 10, gap: 8 }}>
                                {targetTopics.map((tpc) => (
                                  <View key={tpc} style={styles.targetPill}>
                                    <Ionicons name="flag" size={14} color="#111827" />
                                    <Text style={styles.targetPillText} numberOfLines={1}>
                                      {tpc}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </>
                          )
                        ) : (
                          <Text style={styles.targetsText}>Practice mode complete ✅</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {!!selectedUnit && (
                    <View style={[styles.currentUnitChip, { marginTop: 14, marginBottom: 0 }]}>
                      <Ionicons name="bookmarks-outline" size={14} color="#111827" />
                      <Text style={styles.currentUnitChipText}>{selectedUnit}</Text>
                    </View>
                  )}

                  {mode === "quiz" && wrongIds.length > 0 && (
                    <Pressable
                      onPress={startPracticeWrong}
                      style={({ pressed }) => [styles.donePracticeBtn, pressed && { opacity: 0.92 }]}
                    >
                      <Ionicons name="refresh" size={18} color="#fff" />
                      <Text style={styles.donePracticeText}>{T.practiceBtn}</Text>
                    </Pressable>
                  )}

                  <View style={{ marginTop: 10, gap: 10 }}>
                    <Pressable
                      onPress={restartQuiz}
                      style={({ pressed }) => [styles.doneReplayBtn, pressed && { opacity: 0.92 }]}
                    >
                      <Ionicons name="sparkles" size={18} color="#fff" />
                      <Text style={styles.doneReplayText}>{T.generateQuiz}</Text>
                    </Pressable>

                    <Pressable
                      onPress={openUnitPickerFromResults}
                      style={({ pressed }) => [styles.doneChangeUnitBtn, pressed && { opacity: 0.92 }]}
                    >
                      <Ionicons name="library-outline" size={18} color="#111827" />
                      <Text style={styles.doneChangeUnitText}>{T.changeUnit}</Text>
                    </Pressable>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <NextStepFooter
                      onPlayAgain={restartQuiz}
                      nextLessonPath="/tabs/lessons"
                      nextQuizPath="/tabs/quizzes"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={showExplainSheet}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExplainSheet(false)}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowExplainSheet(false)}>
            <Pressable style={styles.sheetCard} onPress={() => {}}>
              <View style={styles.sheetTop}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={styles.sheetIcon}>
                    <Ionicons name="bulb" size={16} color="#111827" />
                  </View>
                  <Text style={styles.sheetTitle}>{T.explainTitle}</Text>
                </View>

                <Pressable onPress={() => setShowExplainSheet(false)} style={styles.sheetClose}>
                  <Ionicons name="close" size={18} color="#111827" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.sheetText, rtl]}>{q?.explanation ?? ""}</Text>

                <View style={{ marginTop: 12, gap: 10 }}>
                  <Pressable
                    onPress={goAskAI}
                    style={({ pressed }) => [styles.askAIBtn, pressed && { opacity: 0.92 }]}
                  >
                    <Ionicons name="sparkles" size={18} color="#fff" />
                    <Text style={styles.askAIBtnText}>{T.askAI}</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setShowExplainSheet(false)}
                    style={({ pressed }) => [styles.gotItBtn, pressed && { opacity: 0.92 }]}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.gotItText}>{T.gotIt}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showUnitSelector}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUnitSelector(false)}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowUnitSelector(false)}>
            <Pressable style={[styles.sheetCard, { maxHeight: "80%" }]} onPress={() => {}}>
              <View style={styles.sheetTop}>
                <Text style={styles.sheetTitle}>{T.selectUnit}</Text>
                <Pressable onPress={() => setShowUnitSelector(false)} style={styles.sheetClose}>
                  <Ionicons name="close" size={18} color="#111827" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 10 }}>
                  {units.map((unit) => {
                    const lessons = getLessonInfoByUnit(unit);
                    const selectedNow = selectedUnit === unit;

                    return (
                      <Pressable
                        key={unit}
                        onPress={() => {
                          setSelectedUnit(unit);
                          setGenerationError(null);
                          setShowUnitSelector(false);
                        }}
                        style={({ pressed }) => [
                          styles.lessonOption,
                          selectedNow && styles.lessonOptionSelected,
                          pressed && { opacity: 0.92 },
                        ]}
                      >
                        <View style={styles.unitOptionTop}>
                          <Text style={[styles.lessonTitle, rtl]} numberOfLines={2}>
                            {unit}
                          </Text>

                          {selectedNow ? (
                            <View style={styles.unitSelectedBadge}>
                              <Ionicons name="checkmark" size={14} color="#fff" />
                            </View>
                          ) : (
                            <View style={styles.unitLessonCount}>
                              <Text style={styles.unitLessonCountText}>{lessons.length}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={[styles.lessonSub, rtl]} numberOfLines={2}>
                          {lessons.map((l) => l.title).join(" • ")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ marginTop: 14 }}>
                  <Pressable
                    onPress={() => setShowUnitSelector(false)}
                    style={({ pressed }) => [styles.lessonCancel, pressed && { opacity: 0.92 }]}
                  >
                    <Text style={styles.lessonCancelText}>{T.cancel}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

/* ----------------------------- styles ---------------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, backgroundColor: "transparent" },

  scroll: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { paddingTop: 14 },

  shell: { width: "100%", maxWidth: 980, alignSelf: "center" },

  bgDecorWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
  blobA: {
    width: 220,
    height: 220,
    left: -70,
    top: 120,
    backgroundColor: "rgba(255,122,89,0.22)",
  },
  blobB: {
    width: 260,
    height: 260,
    right: -90,
    top: 40,
    backgroundColor: "rgba(91,53,242,0.18)",
  },
  blobC: {
    width: 280,
    height: 280,
    right: -110,
    bottom: 30,
    backgroundColor: "rgba(86,204,242,0.18)",
  },
  sparkleDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  quizCard: {
    backgroundColor: CARD,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  funHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  funHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  funIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  funTitle: { color: INK, fontWeight: "900", fontSize: 16 },
  funSub: { color: "rgba(17,24,39,0.60)", fontWeight: "800", marginTop: 2, fontSize: 12 },
  funBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  lobbyWrap: {
    marginTop: 6,
    gap: 14,
  },
  lobbyHero: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.10)",
  },
  lobbyTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  lobbyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(91,53,242,0.08)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.15)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  lobbyBadgeText: {
    color: "#5B35F2",
    fontWeight: "900",
  },
  lobbyHeroMain: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  lobbyTitle: {
    color: INK,
    fontSize: 24,
    fontWeight: "900",
  },
  lobbySub: {
    marginTop: 8,
    color: "rgba(17,24,39,0.72)",
    lineHeight: 20,
    fontWeight: "800",
  },
  unitPreviewPill: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  unitPreviewText: {
    color: INK,
    fontWeight: "900",
  },
  lobbyMascotWrap: {
    width: 100,
    height: 100,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  lobbyMascotBig: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: "#F3EDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  lobbyMascotSmall: {
    position: "absolute",
    top: 6,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  lobbyActions: {
    flexDirection: "row",
    gap: 10,
  },
  lobbyUnitBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  lobbyUnitBtnText: {
    color: INK,
    fontWeight: "900",
  },
  lobbyStartBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#5B35F2",
    borderWidth: 2,
    borderColor: "#5B35F2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  lobbyStartBtnReady: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  lobbyStartBtnText: {
    color: "#fff",
    fontWeight: "900",
  },

  /* ⚡ New: preloading / ready hint styles */
  preloadHintCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(91,53,242,0.06)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  preloadHintText: {
    color: "rgba(17,24,39,0.72)",
    fontWeight: "800",
    fontSize: 13,
  },
  readyHintCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.20)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  readyHintText: {
    color: "#16A34A",
    fontWeight: "900",
    fontSize: 13,
  },

  emptyHintCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(91,53,242,0.07)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.14)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  emptyHintTitle: {
    color: INK,
    fontWeight: "900",
  },
  emptyHintSub: {
    marginTop: 4,
    color: "rgba(17,24,39,0.72)",
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 17,
  },

  errorCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(220,38,38,0.07)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  errorTitle: {
    color: "#991B1B",
    fontWeight: "900",
  },
  errorSub: {
    marginTop: 4,
    color: "rgba(17,24,39,0.72)",
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 17,
  },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qOf: { color: "rgba(17,24,39,0.72)", fontWeight: "900" },
  score: { color: "rgba(47,107,255,0.95)", fontWeight: "900" },
  scoreNum: { color: "#2F6BFF" },

  progressOuter: {
    marginTop: 10,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(47,107,255,0.14)",
    overflow: "hidden",
  },
  progressInnerGradient: {
    height: "100%",
    borderRadius: 999,
  },

  quizTopTools: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  currentUnitChip: {
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,213,74,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,213,74,0.55)",
  },
  currentUnitChipText: {
    color: INK,
    fontWeight: "900",
  },

  thinkingCard: {
    marginTop: 14,
    paddingVertical: 26,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.20)",
    backgroundColor: "rgba(91,53,242,0.07)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  thinkingTitle: { marginTop: 10, fontSize: 18, fontWeight: "900", color: INK },
  thinkingSub: { fontWeight: "800", color: "rgba(17,24,39,0.65)", textAlign: "center" },

  tagsRow: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 12 },
  tag: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  tagGreen: { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.22)" },
  tagTextGreen: { color: "#16A34A", fontWeight: "900" },
  tagPurple: { backgroundColor: "rgba(91,53,242,0.10)", borderColor: "rgba(91,53,242,0.20)" },
  tagTextPurple: { color: "#5B35F2", fontWeight: "900" },

  question: { color: INK, fontSize: 20, fontWeight: "900", marginBottom: 14, lineHeight: 26 },

  optionBase: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionBadgeText: {
    color: INK,
    fontWeight: "900",
  },
  optionTextBase: { flex: 1, fontSize: 16, fontWeight: "900" },

  optionIdle: { backgroundColor: "#fff", borderColor: "rgba(17,24,39,0.14)" },
  optionTextIdle: { color: INK },

  optionSelected: { backgroundColor: "rgba(86,204,242,0.18)", borderColor: "rgba(86,204,242,0.70)" },
  optionTextSelected: { color: INK },

  optionCorrect: { backgroundColor: "rgba(34,197,94,0.14)", borderColor: "rgba(34,197,94,0.55)" },
  optionWrong: { backgroundColor: "rgba(220,38,38,0.10)", borderColor: "rgba(220,38,38,0.55)" },

  optionIdleAnswered: { backgroundColor: "rgba(17,24,39,0.03)", borderColor: "rgba(17,24,39,0.10)" },
  optionTextIdleAnswered: { color: "rgba(17,24,39,0.55)" },

  feedbackBanner: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerOk: { backgroundColor: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.25)" },
  bannerBad: { backgroundColor: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.20)" },
  bannerText: { fontWeight: "900" },

  hintBtn: {
    width: "100%",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,213,74,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,213,74,0.55)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hintBtnText: { color: INK, fontWeight: "900" },

  askAIBtn: {
    width: "100%",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#5B35F2",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.4)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  askAIBtnText: { color: "#fff", fontWeight: "900" },

  bottomRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnGhost: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.14)",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnGhostText: { color: INK, fontWeight: "900" },
  btnPrimary: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#5B35F2",
    backgroundColor: "#5B35F2",
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },

  doneWrap: { marginTop: 6 },
  doneBanner: {
    borderRadius: 22,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
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
  doneBadgeText: { color: INK, fontWeight: "900" },
  doneStarsRow: { flexDirection: "row", gap: 4 },
  doneTitle: { marginTop: 12, color: INK, fontWeight: "900", fontSize: 28 },
  doneScoreRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },

  bigScorePill: {
    width: 96,
    height: 72,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  bigScoreText: { color: INK, fontWeight: "900", fontSize: 22 },
  doneScore: { color: "rgba(17,24,39,0.82)", fontWeight: "900", fontSize: 16 },

  miniBarOuter: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
  },
  miniBarInner: { height: "100%", borderRadius: 999, backgroundColor: "#111827" },

  confettiRow: { marginTop: 14, flexDirection: "row", gap: 10, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.85)" },

  doneCardsRow: { marginTop: 14, flexDirection: "row", gap: 12 },
  smallCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  smallCardTitle: { color: INK, fontWeight: "900" },

  rewardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rewardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(47,107,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardText: { color: INK, fontWeight: "900" },

  targetsText: { color: "rgba(17,24,39,0.75)", fontWeight: "900" },
  targetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,213,74,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,213,74,0.65)",
  },
  targetPillText: { flex: 1, color: INK, fontWeight: "900" },

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
    backgroundColor: "#5B35F2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  doneReplayText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  doneChangeUnitBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.12)",
  },
  doneChangeUnitText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 16,
  },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.30)", justifyContent: "center", padding: 16 },
  sheetCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    maxHeight: "80%",
  },
  sheetTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sheetTitle: { fontWeight: "900", color: INK, fontSize: 16 },
  sheetIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: "rgba(255,213,74,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,213,74,0.65)",
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetText: { color: INK, fontWeight: "800", lineHeight: 20 },

  gotItBtn: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  gotItText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  lessonOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(17,24,39,0.04)",
  },
  lessonOptionSelected: {
    borderColor: "#5B35F2",
    backgroundColor: "rgba(91,53,242,0.08)",
  },
  unitOptionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  unitLessonCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#5B35F2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  unitLessonCountText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  unitSelectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  lessonTitle: { color: INK, fontWeight: "900", flex: 1 },
  lessonSub: { marginTop: 4, color: "rgba(17,24,39,0.65)", fontWeight: "800", fontSize: 12 },

  lessonCancel: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonCancelText: { color: "#fff", fontWeight: "900" },
});