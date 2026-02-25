// app/(tabs)/quizzes.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { NextStepFooter } from "../../components/NextStepFooter";

import { generateQuizFromTranscript } from "../../lib/ai.local";
import { getLessonInfoByUnit, type LessonTranscript } from "../../lib/lessonTranscripts";

/* ----------------------------- Quiz Data ---------------------------- */

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  explanation: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  type?: "Premade Quiz" | "Practice" | "AI Quiz";
};

const BASE_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question:
      "If you have 2 hundreds blocks, 4 tens blocks, and 7 ones blocks, what number do they represent?",
    options: ["247", "274", "427", "742"],
    correctAnswer: "247",
    topic: "Place Value Blocks",
    explanation:
      "Count each type of block: 2 hundreds = 200, 4 tens = 40, 7 ones = 7. Add them together: 200 + 40 + 7 = 247.",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 2,
    question: "In the number 5,372, what is the value of the digit 3?",
    options: ["3", "30", "300", "3,000"],
    correctAnswer: "300",
    topic: "Place Value Tables",
    explanation: "The digit 3 is in the hundreds place. So its value is 3 × 100 = 300.",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 3,
    question: "What is the place value of 7 in the number 47,856?",
    options: ["Ones", "Tens", "Hundreds", "Thousands"],
    correctAnswer: "Thousands",
    topic: "Finding Place Value",
    explanation:
      "Looking at 47,856 from right to left: 6 is ones, 5 is tens, 8 is hundreds, 7 is thousands.",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 4,
    question: "Using the digits 3, 8, 1, 5, what is the largest number you can make?",
    options: ["1358", "3158", "5831", "8531"],
    correctAnswer: "8531",
    topic: "Creating the Largest Number",
    explanation:
      "To make the largest number, put the biggest digits in the highest place values: 8 in thousands, 5 in hundreds, 3 in tens, 1 in ones = 8,531.",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 5,
    question:
      "In a place value chart, what number is shown by: Ten-thousands: 4, Thousands: 0, Hundreds: 6, Tens: 2, Ones: 9?",
    options: ["40,629", "46,290", "4,629", "406,290"],
    correctAnswer: "40,629",
    topic: "Place Value Tables",
    explanation:
      "Read from left to right: 4 in ten-thousands = 40,000, 0 in thousands = 0, 6 in hundreds = 600, 2 in tens = 20, 9 in ones = 9. Total: 40,629.",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 6,
    question: "How many tens blocks would you need to represent the number 340?",
    options: ["3", "4", "34", "40"],
    correctAnswer: "4",
    topic: "Place Value Blocks",
    explanation:
      "340 = 3 hundreds + 4 tens + 0 ones. So you need 4 tens blocks (the digit in the tens place).",
    difficulty: "Easy",
    type: "Premade Quiz",
  },
  {
    id: 7,
    question: "What is the expanded form of 6,258?",
    options: ["6 + 2 + 5 + 8", "6,000 + 200 + 50 + 8", "6 × 1000 + 2 × 100", "62 + 58"],
    correctAnswer: "6,000 + 200 + 50 + 8",
    topic: "Finding Place Value",
    explanation:
      "Break down each digit by its place value: 6 is in thousands (6,000), 2 is in hundreds (200), 5 is in tens (50), 8 is in ones (8).",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 8,
    question:
      "If you arrange the digits 2, 9, 4, 7 to make the smallest possible number, what do you get?",
    options: ["2479", "2749", "4279", "7942"],
    correctAnswer: "2479",
    topic: "Creating the Largest Number",
    explanation:
      "To make the smallest number, put the smallest digits in the highest place values: 2 in thousands, 4 in hundreds, 7 in tens, 9 in ones = 2,479.",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 9,
    question: "In the number 80,456, what role does the zero play?",
    options: ["It has no value", "It's a placeholder", "It means 80", "It's an error"],
    correctAnswer: "It's a placeholder",
    topic: "Place Value Tables",
    explanation:
      "The zero is a placeholder in the thousands position, showing that there are no thousands. Without it, the number would be 8,456 instead of 80,456.",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 10,
    question:
      "If you have 1 thousand block, 0 hundred blocks, 3 ten blocks, and 5 one blocks, what number is represented?",
    options: ["135", "1,035", "1,305", "10,35"],
    correctAnswer: "1,035",
    topic: "Place Value Blocks",
    explanation:
      "Count the blocks: 1 thousand = 1,000, 0 hundreds = 0, 3 tens = 30, 5 ones = 5. Total: 1,000 + 0 + 30 + 5 = 1,035.",
    difficulty: "Easy",
    type: "Premade Quiz",
  },
  {
    id: 11,
    question: "Which of these numbers has a 5 in the tens place?",
    options: ["5,432", "2,453", "3,254", "4,325"],
    correctAnswer: "3,254",
    topic: "Finding Place Value",
    explanation:
      "In 3,254: 3 is thousands, 2 is hundreds, 5 is tens, 4 is ones. Only 3,254 has 5 in the tens place.",
    difficulty: "Medium",
    type: "Premade Quiz",
  },
  {
    id: 12,
    question: "Using digits 9, 2, 6, 0, what's the largest 4-digit number you can create?",
    options: ["9620", "9602", "9260", "9026"],
    correctAnswer: "9620",
    topic: "Creating the Largest Number",
    explanation:
      "Arrange from largest to smallest: 9 (thousands), 6 (hundreds), 2 (tens), 0 (ones) = 9,620.",
    difficulty: "Easy",
    type: "Premade Quiz",
  },
];

/* ------------------------------- Lightweight i18n ------------------------------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    qOf: (a: number, b: number) => string;
    score: string;
    premade: string;
    practice: string;
    aiQuiz: string;
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
    practiceBtn: string;
    noWrong: string;

    rank: string;
    rankA: string;
    rankB: string;
    rankC: string;
    rankD: string;
    rewardsTitle: string;
    wrongTitle: string;

    genBtn: string;
    selectLesson: string;
    cancel: string;
    thinkingTitle: string;
    thinkingSub: string;

    explainTitle: string;
    gotIt: string;

    // nudge
    needHelpTitle: string;
    needHelpSub: string;
  }
> = {
  English: {
    qOf: (a, b) => `Question ${a} / ${b}`,
    score: "Score",
    premade: "Premade Quiz",
    practice: "Practice",
    aiQuiz: "AI Quiz",
    explain: "Explain the Answer",
    askAI: "Ask Offklass AI",
    back: "Back",
    next: "Next",
    submit: "Submit",
    finish: "Finish",
    correct: "Correct",
    incorrect: "Incorrect",

    doneTitle: "Level Complete!",
    doneScore: (s, t) => `You scored ${s} / ${t}`,
    playAgain: "Play Again",
    practiceBtn: "Practice Wrong Questions",
    noWrong: "Perfect! No wrong questions 🎉",

    rank: "Rank",
    rankA: "Legend",
    rankB: "Pro",
    rankC: "Rising Star",
    rankD: "Keep Going",
    rewardsTitle: "Rewards",
    wrongTitle: "Practice Targets",

    genBtn: "Generate AI Quiz",
    selectLesson: "Select a Lesson",
    cancel: "Cancel",
    thinkingTitle: "Offklass is thinking...",
    thinkingSub: "Creating your custom quiz.",

    explainTitle: "Explanation",
    gotIt: "Got it!",

    needHelpTitle: "You got this wrong 😅",
    needHelpSub: "Want help? Ask Offklass AI and I’ll explain step-by-step.",
  },
  नेपाली: {
    qOf: (a, b) => `प्रश्न ${a} / ${b}`,
    score: "अंक",
    premade: "तयार क्विज",
    practice: "अभ्यास",
    aiQuiz: "AI क्विज",
    explain: "उत्तर बुझाउनुहोस्",
    askAI: "Offklass AI लाई सोध्नुहोस्",
    back: "पछाडि",
    next: "अर्को",
    submit: "पेश गर्नुहोस्",
    finish: "समाप्त",
    correct: "सही",
    incorrect: "गलत",

    doneTitle: "लेभल पूरा!",
    doneScore: (s, t) => `तपाईंको स्कोर ${s} / ${t}`,
    playAgain: "फेरि खेल्नुहोस्",
    practiceBtn: "गलत प्रश्न अभ्यास गर्नुहोस्",
    noWrong: "एकदमै राम्रो! कुनै गलत छैन 🎉",

    rank: "र्‍याङ्क",
    rankA: "लेजेंड",
    rankB: "प्रो",
    rankC: "राइजिङ स्टार",
    rankD: "जारी राख्नुहोस्",
    rewardsTitle: "इनाम",
    wrongTitle: "अभ्यास लक्ष्य",

    genBtn: "AI क्विज बनाउनुहोस्",
    selectLesson: "पाठ छान्नुहोस्",
    cancel: "रद्द गर्नुहोस्",
    thinkingTitle: "Offklass सोच्दैछ...",
    thinkingSub: "तपाईंको कस्टम क्विज बनाउँदै।",

    explainTitle: "व्याख्या",
    gotIt: "बुझें!",

    needHelpTitle: "यो गलत भयो 😅",
    needHelpSub: "मद्दत चाहियो? Offklass AI लाई सोध्नुहोस्।",
  },
  اردو: {
    qOf: (a, b) => `سوال ${a} / ${b}`,
    score: "اسکور",
    premade: "تیار کوئز",
    practice: "پریکٹس",
    aiQuiz: "AI کوئز",
    explain: "جواب سمجھائیں",
    askAI: "Offklass AI سے پوچھیں",
    back: "واپس",
    next: "اگلا",
    submit: "جمع کریں",
    finish: "ختم",
    correct: "درست",
    incorrect: "غلط",

    doneTitle: "لیول مکمل!",
    doneScore: (s, t) => `آپ کا اسکور ${s} / ${t}`,
    playAgain: "دوبارہ کھیلیں",
    practiceBtn: "غلط سوالات کی مشق",
    noWrong: "زبردست! کوئی غلط نہیں 🎉",

    rank: "رینک",
    rankA: "لیجنڈ",
    rankB: "پرو",
    rankC: "رائزنگ اسٹار",
    rankD: "جاری رکھیں",
    rewardsTitle: "انعامات",
    wrongTitle: "پریکٹس ہدف",

    genBtn: "AI کوئز بنائیں",
    selectLesson: "سبق منتخب کریں",
    cancel: "منسوخ",
    thinkingTitle: "Offklass سوچ رہا ہے...",
    thinkingSub: "آپ کا کسٹم کوئز تیار ہو رہا ہے۔",

    explainTitle: "وضاحت",
    gotIt: "سمجھ گیا!",

    needHelpTitle: "یہ غلط ہو گیا 😅",
    needHelpSub: "مدد چاہیے؟ Offklass AI سے پوچھیں۔",
  },
  বাংলা: {
    qOf: (a, b) => `প্রশ্ন ${a} / ${b}`,
    score: "স্কোর",
    premade: "প্রিমেড কুইজ",
    practice: "প্র্যাকটিস",
    aiQuiz: "AI কুইজ",
    explain: "উত্তর ব্যাখ্যা করুন",
    askAI: "Offklass AI কে জিজ্ঞেস করুন",
    back: "ফিরে যান",
    next: "পরবর্তী",
    submit: "জমা দিন",
    finish: "শেষ",
    correct: "সঠিক",
    incorrect: "ভুল",

    doneTitle: "লেভেল শেষ!",
    doneScore: (s, t) => `আপনার স্কোর ${s} / ${t}`,
    playAgain: "আবার খেলুন",
    practiceBtn: "ভুল প্রশ্ন প্র্যাকটিস",
    noWrong: "দারুণ! কোনো ভুল নেই 🎉",

    rank: "র‍্যাঙ্ক",
    rankA: "লেজেন্ড",
    rankB: "প্রো",
    rankC: "রাইজিং স্টার",
    rankD: "চালিয়ে যান",
    rewardsTitle: "রিওয়ার্ড",
    wrongTitle: "প্র্যাকটিস টার্গেট",

    genBtn: "AI কুইজ তৈরি করুন",
    selectLesson: "লেসন নির্বাচন করুন",
    cancel: "বাতিল",
    thinkingTitle: "Offklass ভাবছে...",
    thinkingSub: "আপনার কাস্টম কুইজ বানাচ্ছে।",

    explainTitle: "ব্যাখ্যা",
    gotIt: "বুঝেছি!",

    needHelpTitle: "এটা ভুল হয়েছে 😅",
    needHelpSub: "সহায়তা চান? Offklass AI কে জিজ্ঞেস করুন।",
  },
  हिन्दी: {
    qOf: (a, b) => `प्रश्न ${a} / ${b}`,
    score: "स्कोर",
    premade: "Premade Quiz",
    practice: "Practice",
    aiQuiz: "AI Quiz",
    explain: "Answer समझाओ",
    askAI: "Ask Offklass AI",
    back: "Back",
    next: "Next",
    submit: "Submit",
    finish: "Finish",
    correct: "Correct",
    incorrect: "Incorrect",

    doneTitle: "Level Complete!",
    doneScore: (s, t) => `You scored ${s} / ${t}`,
    playAgain: "Play Again",
    practiceBtn: "Practice Wrong Questions",
    noWrong: "Perfect! No wrong questions 🎉",

    rank: "Rank",
    rankA: "Legend",
    rankB: "Pro",
    rankC: "Rising Star",
    rankD: "Keep Going",
    rewardsTitle: "Rewards",
    wrongTitle: "Practice Targets",

    genBtn: "Generate AI Quiz",
    selectLesson: "Select a Lesson",
    cancel: "Cancel",
    thinkingTitle: "Offklass is thinking...",
    thinkingSub: "Creating your custom quiz.",

    explainTitle: "Explanation",
    gotIt: "Got it!",

    needHelpTitle: "This is wrong 😅",
    needHelpSub: "Need help? Ask Offklass AI for step-by-step.",
  },
};

/* ------------------------------- Kids-friendly UI ------------------------------ */

const BG_TOP = "#BDE6FF";
const BG_MID = "#FFF2B8";
const BG_BOT = "#E7D7FF";

const CARD = "rgba(255,255,255,0.94)";
const INK = "#111827";

type AnswerState = { selected: string | null; isAnswered: boolean };

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

  // mode + questions
  const [mode, setMode] = useState<"quiz" | "practice">("quiz");
  const [questions, setQuestions] = useState<QuizQuestion[]>(BASE_QUESTIONS);

  // navigation + answers
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [done, setDone] = useState(false);

  // wrong question ids from QUIZ mode
  const [wrongIds, setWrongIds] = useState<number[]>([]);

  // explanation sheet
  const [showExplainSheet, setShowExplainSheet] = useState(false);

  // AI quiz generation
  const [showLessonSelector, setShowLessonSelector] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("Unit 1: Place Value");
  const [availableTranscripts, setAvailableTranscripts] = useState<LessonTranscript[]>([]);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // ✅ wrong-help nudge animation
  const [showHelpNudge, setShowHelpNudge] = useState(false);
  const nudgeOpacity = useRef(new Animated.Value(0)).current;
  const nudgeY = useRef(new Animated.Value(10)).current;
  const nudgeScale = useRef(new Animated.Value(0.98)).current;

  function playNudge() {
    setShowHelpNudge(true);
    nudgeOpacity.setValue(0);
    nudgeY.setValue(10);
    nudgeScale.setValue(0.98);

    Animated.parallel([
      Animated.timing(nudgeOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(nudgeY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(nudgeScale, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function hideNudge() {
    setShowHelpNudge(false);
    nudgeOpacity.stopAnimation();
    nudgeY.stopAnimation();
    nudgeScale.stopAnimation();
  }

  const goAskAI = () => {
    // NOTE: Make sure you have this route in your app.
    // If your AI tab path is different, change "/tabs/ai" accordingly.
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

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const l = (saved?.language as Lang) || "English";
      setLang(LANGS.includes(l) ? l : "English");
    })();
  }, []);

  useEffect(() => {
    if (!showLessonSelector) return;
    setIsLoadingTranscripts(true);
    try {
      const transcripts = getLessonInfoByUnit(selectedUnit);
      setAvailableTranscripts(transcripts);
    } finally {
      setIsLoadingTranscripts(false);
    }
  }, [showLessonSelector, selectedUnit]);

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

  const selectOption = (opt: string) => {
    if (done) return;
    if (isAnswered) return;
    if (!q) return;

    hideNudge(); // reset nudge when changing selection

    setAnswers((prev) => ({
      ...prev,
      [q.id]: { selected: opt, isAnswered: false },
    }));
  };

  const submit = () => {
    if (done) return;
    if (!q) return;
    if (selected == null) return;
    if (isAnswered) return;

    const isWrong = selected !== q.correctAnswer;

    setAnswers((prev) => ({
      ...prev,
      [q.id]: { selected, isAnswered: true },
    }));

    if (mode === "quiz" && isWrong) {
      setWrongIds((ids) => (ids.includes(q.id) ? ids : [...ids, q.id]));
    }

    // ✅ show nudge if wrong
    if (isWrong) {
      playNudge();
    } else {
      hideNudge();
    }
  };

  const goNextOrFinish = () => {
    if (done) return;
    if (!isAnswered) return;

    hideNudge();

    if (current < total - 1) {
      setCurrent((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  const backQuestion = () => {
    if (done) return;

    hideNudge();

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

  const restartQuiz = () => {
    setMode("quiz");
    setQuestions(BASE_QUESTIONS);
    setCurrent(0);
    setAnswers({});
    setWrongIds([]);
    setDone(false);
    setShowExplainSheet(false);
    hideNudge();
  };

  const startPracticeWrong = () => {
    const wrong = BASE_QUESTIONS.filter((qq) => wrongIds.includes(qq.id));
    if (wrong.length === 0) return;

    setMode("practice");
    setQuestions(
      wrong.map((qq) => ({
        ...qq,
        type: "Practice",
      }))
    );
    setCurrent(0);
    setAnswers({});
    setDone(false);
    setShowExplainSheet(false);
    hideNudge();
  };

  async function generateAIQuiz(lesson: LessonTranscript) {
    setShowLessonSelector(false);
    setIsGeneratingQuiz(true);

    try {
      const generated = await generateQuizFromTranscript(
        lesson.transcript,
        lesson.title,
        lesson.topic
      );

      if (generated && generated.length > 0) {
        const quizQuestions: QuizQuestion[] = generated.map((g: any, idx: number) => ({
          id: typeof g.id === "number" ? g.id : idx + 1,
          question: g.question,
          options: g.options,
          correctAnswer: g.correctAnswer,
          topic: g.topic ?? lesson.topic ?? "Lesson",
          explanation: g.explanation ?? "",
          difficulty: g.difficulty ?? "Medium",
          type: "AI Quiz",
        }));

        setMode("quiz");
        setQuestions(quizQuestions);

        setCurrent(0);
        setAnswers({});
        setWrongIds([]);
        setDone(false);
        setShowExplainSheet(false);
        hideNudge();
      }
    } catch (e) {
      console.error("AI quiz generation error:", e);
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  const headerTagType = q?.type ?? (mode === "practice" ? T.practice : T.premade);
  const headerTagDiff = q?.difficulty ?? "Medium";

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

  const wrongCount = wrongIds.length;
  const targetTopics = useMemo(() => {
    const wrongQs = BASE_QUESTIONS.filter((qq) => wrongIds.includes(qq.id));
    const topics = Array.from(new Set(wrongQs.map((x) => x.topic)));
    return topics.slice(0, 3);
  }, [wrongIds]);

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
              {/* Fun header */}
              <View style={styles.funHeaderRow}>
                <View style={styles.funHeaderLeft}>
                  <View style={styles.funIcon}>
                    <Ionicons name="school" size={18} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.funTitle}>Offklass Quizzes</Text>
                    <Text style={styles.funSub}>Let’s learn + play 🎯</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.funBackBtn, pressed && { opacity: 0.9 }]}
                >
                  <Ionicons name="arrow-back" size={18} color={INK} />
                </Pressable>
              </View>

              {/* Top row */}
              <View style={styles.topRow}>
                <Text style={[styles.qOf, rtl]}>{T.qOf(current + 1, total)}</Text>
                <Text style={[styles.score, rtl]}>
                  {T.score}: <Text style={styles.scoreNum}>{score}</Text> / {total}
                </Text>
              </View>

              {/* progress */}
              <View style={styles.progressOuter}>
                <View style={[styles.progressInner, { width: `${progressPct}%` }]} />
              </View>

              {/* AI quiz generator */}
              {!done && !isGeneratingQuiz && mode === "quiz" && (
                <Pressable
                  onPress={() => setShowLessonSelector(true)}
                  style={({ pressed }) => [styles.genBtn, pressed && { opacity: 0.92 }]}
                >
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.genBtnText}>{T.genBtn}</Text>
                </Pressable>
              )}

              {/* Generating */}
              {isGeneratingQuiz ? (
                <View style={styles.thinkingCard}>
                  <ActivityIndicator size="large" color="#5B35F2" />
                  <Text style={[styles.thinkingTitle, rtl]}>{T.thinkingTitle}</Text>
                  <Text style={[styles.thinkingSub, rtl]}>{T.thinkingSub}</Text>
                </View>
              ) : !done ? (
                <>
                  {/* tags */}
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

                  {/* question */}
                  <Text style={[styles.question, rtl]}>{q?.question ?? "—"}</Text>

                  {/* options */}
                  {!!q && (
                    <View style={{ gap: 12 }}>
                      {q.options.map((opt) => {
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
                            key={opt}
                            activeOpacity={0.85}
                            disabled={isAnswered}
                            onPress={() => selectOption(opt)}
                            style={[styles.optionBase, boxStyle]}
                          >
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

                  {/* feedback banner */}
                  {!!q && isAnswered && (
                    <View style={[styles.feedbackBanner, answeredCorrect ? styles.bannerOk : styles.bannerBad]}>
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

                  {/* ✅ "You got this wrong — want help?" animated nudge */}
                  {!!q && isAnswered && !answeredCorrect && showHelpNudge && (
                    <Animated.View
                      style={[
                        styles.helpNudge,
                        {
                          opacity: nudgeOpacity,
                          transform: [{ translateY: nudgeY }, { scale: nudgeScale }],
                        },
                      ]}
                    >
                      <View style={styles.helpNudgeLeft}>
                        <View style={styles.helpNudgeIcon}>
                          <Ionicons name="sparkles" size={16} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.helpNudgeTitle, rtl]}>{T.needHelpTitle}</Text>
                          <Text style={[styles.helpNudgeSub, rtl]}>{T.needHelpSub}</Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={goAskAI}
                        style={({ pressed }) => [styles.helpNudgeBtn, pressed && { opacity: 0.92 }]}
                      >
                        <Text style={styles.helpNudgeBtnText}>{T.askAI}</Text>
                      </Pressable>
                    </Animated.View>
                  )}

                  {/* Explain + Ask AI (under explain) */}
                  {!done && !isGeneratingQuiz && (
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
                  )}

                  {/* bottom buttons */}
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
                // DONE
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
                          <Text style={styles.rewardText}>Streak Boost</Text>
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
                          wrongCount === 0 ? (
                            <Text style={styles.targetsText}>{T.noWrong}</Text>
                          ) : (
                            <>
                              <Text style={styles.targetsText}>{wrongCount} questions to practice</Text>
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

                  {mode === "quiz" && wrongCount > 0 && (
                    <Pressable
                      onPress={startPracticeWrong}
                      style={({ pressed }) => [styles.donePracticeBtn, pressed && { opacity: 0.92 }]}
                    >
                      <Ionicons name="refresh" size={18} color="#fff" />
                      <Text style={styles.donePracticeText}>{T.practiceBtn}</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={restartQuiz}
                    style={({ pressed }) => [styles.doneReplayBtn, pressed && { opacity: 0.92 }]}
                  >
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.doneReplayText}>{T.playAgain}</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.doneExitBtn, pressed && { opacity: 0.92 }]}
                  >
                    <Ionicons name="home" size={18} color="#111827" />
                    <Text style={styles.doneExitText}>Go Back</Text>
                  </Pressable>

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

        {/* Explanation modal */}
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

                {/* ✅ Ask Offklass AI inside explain sheet too */}
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

        {/* Lesson selector modal (AI quiz) */}
        <Modal
          visible={showLessonSelector}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLessonSelector(false)}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowLessonSelector(false)}>
            <Pressable style={[styles.sheetCard, { maxHeight: "80%" }]} onPress={() => {}}>
              <View style={styles.sheetTop}>
                <Text style={styles.sheetTitle}>{T.selectLesson}</Text>
                <Pressable onPress={() => setShowLessonSelector(false)} style={styles.sheetClose}>
                  <Ionicons name="close" size={18} color="#111827" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {isLoadingTranscripts ? (
                  <View style={{ paddingVertical: 24, alignItems: "center" }}>
                    <ActivityIndicator color="#5B35F2" />
                    <Text style={{ marginTop: 10, fontWeight: "900", color: "rgba(17,24,39,0.7)" }}>
                      Loading lessons...
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {availableTranscripts.map((t) => (
                      <Pressable
                        key={t.lessonId}
                        onPress={() => generateAIQuiz(t)}
                        style={({ pressed }) => [styles.lessonOption, pressed && { opacity: 0.92 }]}
                      >
                        <Text style={[styles.lessonTitle, rtl]} numberOfLines={2}>
                          {t.title}
                        </Text>
                        <Text style={[styles.lessonSub, rtl]} numberOfLines={1}>
                          {t.topic}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 14 }}>
                  <Pressable
                    onPress={() => setShowLessonSelector(false)}
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

/* --------------------------------- Styles --------------------------------- */

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
    backgroundColor: "#5B35F2",
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
  progressInner: { height: "100%", borderRadius: 999, backgroundColor: "#5B35F2" },

  genBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FF7A59",
    borderWidth: 1,
    borderColor: "rgba(255,122,89,0.30)",
  },
  genBtnText: { color: "#fff", fontWeight: "900" },

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
  thinkingSub: { fontWeight: "800", color: "rgba(17,24,39,0.65)" },

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

  /* ✅ help nudge */
  helpNudge: {
    marginTop: 10,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(91,53,242,0.10)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.22)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  helpNudgeLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  helpNudgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#5B35F2",
    alignItems: "center",
    justifyContent: "center",
  },
  helpNudgeTitle: { color: INK, fontWeight: "900" },
  helpNudgeSub: { marginTop: 2, color: "rgba(17,24,39,0.70)", fontWeight: "800", fontSize: 12 },
  helpNudgeBtn: {
    backgroundColor: "#5B35F2",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  helpNudgeBtnText: { color: "#fff", fontWeight: "900" },

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

  doneExitBtn: {
    marginTop: 10,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  doneExitText: { color: INK, fontWeight: "900", fontSize: 16 },

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
  lessonTitle: { color: INK, fontWeight: "900" },
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