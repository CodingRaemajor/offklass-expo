// app/(tabs)/quizzes.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { AskAIButton } from "../../components/AskAIButton";

/* ----------------------------- Quiz Data ---------------------------- */

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  explanation: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  type?: "Premade Quiz" | "Practice";
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
    explain: string;
    placeholder: string;
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

    // game-y copy
    rank: string;
    rankA: string;
    rankB: string;
    rankC: string;
    rankD: string;
    rewardsTitle: string;
    wrongTitle: string;
  }
> = {
  English: {
    qOf: (a, b) => `Question ${a} / ${b}`,
    score: "Score",
    premade: "Premade Quiz",
    practice: "Practice",
    explain: "Explain the Answer",
    placeholder: "Ask for more explanation...",
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
  },
  नेपाली: {
    qOf: (a, b) => `प्रश्न ${a} / ${b}`,
    score: "अंक",
    premade: "तयार क्विज",
    practice: "अभ्यास",
    explain: "उत्तर बुझाउनुहोस्",
    placeholder: "थप व्याख्या सोध्नुहोस्...",
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
  },
  اردو: {
    qOf: (a, b) => `سوال ${a} / ${b}`,
    score: "اسکور",
    premade: "تیار کوئز",
    practice: "پریکٹس",
    explain: "جواب سمجھائیں",
    placeholder: "مزید وضاحت پوچھیں...",
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
  },
  বাংলা: {
    qOf: (a, b) => `প্রশ্ন ${a} / ${b}`,
    score: "স্কোর",
    premade: "প্রিমেড কুইজ",
    practice: "প্র্যাকটিস",
    explain: "উত্তর ব্যাখ্যা করুন",
    placeholder: "আরও ব্যাখ্যা চাই...",
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
  },
  हिन्दी: {
    qOf: (a, b) => `प्रश्न ${a} / ${b}`,
    score: "स्कोर",
    premade: "Premade Quiz",
    practice: "Practice",
    explain: "Answer समझाओ",
    placeholder: "और explanation पूछो...",
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
  },
};

/* ------------------------------- UI (Home-like) ------------------------------ */

const BG = "#EEF4FF";
const WHITE = "rgba(255,255,255,0.92)";

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

  // AI panel
  const [aiText, setAiText] = useState("");
  const [showExplainSheet, setShowExplainSheet] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const l = (saved?.language as Lang) || "English";
      setLang(LANGS.includes(l) ? l : "English");
    })();
  }, []);

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

  const answeredCorrect = isAnswered && selected === q.correctAnswer;

  const selectOption = (opt: string) => {
    if (done) return;
    if (isAnswered) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { selected: opt, isAnswered: false },
    }));
  };

  const submit = () => {
    if (done) return;
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
  };

  const goNextOrFinish = () => {
    if (done) return;
    if (!isAnswered) return;

    if (current < total - 1) {
      setCurrent((i) => i + 1);
      setAiText("");
    } else {
      setDone(true);
    }
  };

  const backQuestion = () => {
    if (done) return;

    if (current > 0) {
      setCurrent((i) => Math.max(0, i - 1));
      setAiText("");
      return;
    }
    router.back();
  };

  const explainNow = () => {
    if (!q) return;
    setShowExplainSheet(true);
    setAiText(q.explanation);
  };

  const restartQuiz = () => {
    setMode("quiz");
    setQuestions(BASE_QUESTIONS);
    setCurrent(0);
    setAnswers({});
    setWrongIds([]);
    setDone(false);
    setAiText("");
    setShowExplainSheet(false);
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
    setAiText("");
    setShowExplainSheet(false);
  };

  const headerTagType = q?.type ?? (mode === "practice" ? T.practice : T.premade);
  const headerTagDiff = q?.difficulty ?? "Medium";

  // ---- game-y results (DONE screen) ----
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
    // show up to 3 targets on results card (makes it feel like a game "quests")
    const wrongQs = BASE_QUESTIONS.filter((qq) => wrongIds.includes(qq.id));
    const topics = Array.from(new Set(wrongQs.map((x) => x.topic)));
    return topics.slice(0, 3);
  }, [wrongIds]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(16, insets.bottom + 16), paddingHorizontal: isTablet ? 22 : 14 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={[styles.shell, isTablet ? styles.shellRow : styles.shellCol]}>
            {/* LEFT: Quiz card */}
            <View style={[styles.left, isTablet ? { flex: 1.1 } : { flex: 1 }]}>
              <View style={styles.quizCard}>
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

                {!done ? (
                  <>
                    {/* tags */}
                    <View style={styles.tagsRow}>
                      <View style={[styles.tag, styles.tagGreen]}>
                        <Text style={styles.tagTextGreen}>{headerTagType}</Text>
                      </View>
                      <View style={[styles.tag, styles.tagPurple]}>
                        <Text style={styles.tagTextPurple}>{headerTagDiff}</Text>
                      </View>
                    </View>

                    {/* question */}
                    <Text style={[styles.question, rtl]}>{q.question}</Text>

                    {/* options */}
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

                    {/* feedback banner */}
                    {isAnswered && (
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

                    {/* bottom buttons */}
                    <View style={styles.bottomRow}>
                      <Pressable
                        onPress={backQuestion}
                        style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.9 }]}
                      >
                        <Ionicons name="arrow-back" size={18} color="#111827" />
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
                          <Text style={styles.btnPrimaryText}>{current < total - 1 ? T.next : T.finish}</Text>
                          <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </Pressable>
                      )}
                    </View>
                  </>
                ) : (
                  // ✅ GAME-Y DONE SCREEN
                  <View style={styles.doneWrap}>
                    {/* Banner */}
                    <LinearGradient
                      colors={["#5B35F2", "#2F6BFF", "#3C5CFF"]}
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
                              color="#FFD54A"
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

                      {/* fun confetti dots */}
                      <View style={styles.confettiRow}>
                        <View style={[styles.dot, { opacity: 0.95 }]} />
                        <View style={[styles.dot, { opacity: 0.7 }]} />
                        <View style={[styles.dot, { opacity: 0.85 }]} />
                        <View style={[styles.dot, { opacity: 0.6 }]} />
                        <View style={[styles.dot, { opacity: 0.9 }]} />
                      </View>
                    </LinearGradient>

                    {/* Rewards / Targets */}
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
                              <Ionicons name="shield-checkmark" size={16} color="#16A34A" />
                            </View>
                            <Text style={styles.rewardText}>Skill Up</Text>
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

                    {/* Buttons */}
                    {mode === "quiz" && wrongCount > 0 && (
                      <Pressable onPress={startPracticeWrong} style={({ pressed }) => [styles.donePracticeBtn, pressed && { opacity: 0.92 }]}>
                        <Ionicons name="refresh" size={18} color="#fff" />
                        <Text style={styles.donePracticeText}>{T.practiceBtn}</Text>
                      </Pressable>
                    )}

                    <Pressable onPress={restartQuiz} style={({ pressed }) => [styles.doneReplayBtn, pressed && { opacity: 0.92 }]}>
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
                  </View>
                )}
              </View>
            </View>

            {/* RIGHT: AI Helper panel (tablet only; not on done) */}
            {isTablet && !done && (
              <View style={[styles.right, { flex: 0.9 }]}>
                <View style={styles.aiCard}>
                  <View style={styles.aiHeader}>
                    <View style={styles.aiHeaderLeft}>
                      <View style={styles.aiIcon}>
                        <Ionicons name="hardware-chip-outline" size={18} color="#fff" />
                      </View>
                      <View>
                        <Text style={styles.aiTitle}>AI Math Helper</Text>
                        <Text style={styles.aiSub}>Ask for more explanations!</Text>
                      </View>
                    </View>
                    <Ionicons name="sparkles-outline" size={18} color="#EAF0FF" />
                  </View>

                  <View style={styles.aiBody}>
                    {aiText ? (
                      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.aiAnswer, rtl]}>{aiText}</Text>

                        <View style={{ marginTop: 14 }}>
                          <AskAIButton
                            question={q.question}
                            userAnswer={selected ?? ""}
                            correctAnswer={q.correctAnswer}
                            contextType="quiz"
                          />
                        </View>
                      </ScrollView>
                    ) : (
                      <View style={styles.aiEmpty}>
                        <View style={styles.aiBotCircle}>
                          <Ionicons name="logo-electron" size={30} color="#fff" />
                        </View>
                        <Text style={[styles.aiEmptyTitle, rtl]}>
                          Want to understand more? <Text style={{ fontSize: 16 }}>💡</Text>
                        </Text>
                        <Text style={[styles.aiEmptySub, rtl]}>
                          Ask me to explain the answer or ask any questions about this concept!
                        </Text>

                        <Pressable onPress={explainNow} style={({ pressed }) => [styles.aiExplainBtn, pressed && { opacity: 0.92 }]}>
                          <Text style={styles.aiExplainText}>{T.explain}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  <View style={styles.aiInputRow}>
                    <TextInput
                      value={""}
                      onChangeText={() => {}}
                      placeholder={T.placeholder}
                      placeholderTextColor="rgba(17,24,39,0.45)"
                      style={styles.aiInput}
                      editable={false}
                    />
                    <Pressable style={styles.aiSendBtn} onPress={explainNow}>
                      <Ionicons name="send" size={18} color="#fff" />
                    </Pressable>
                    <Pressable style={styles.aiLightBtn} onPress={explainNow}>
                      <Ionicons name="bulb-outline" size={20} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Mobile explain button */}
          {!isTablet && !done && (
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={explainNow} style={({ pressed }) => [styles.mobileExplainBtn, pressed && { opacity: 0.92 }]}>
                <Ionicons name="sparkles-outline" size={18} color="#fff" />
                <Text style={styles.mobileExplainText}>{T.explain}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Explanation modal */}
        <Modal visible={showExplainSheet} transparent animationType="fade" onRequestClose={() => setShowExplainSheet(false)}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowExplainSheet(false)}>
            <Pressable style={styles.sheetCard} onPress={() => {}}>
              <View style={styles.sheetTop}>
                <Text style={styles.sheetTitle}>AI Math Helper</Text>
                <Pressable onPress={() => setShowExplainSheet(false)} style={styles.sheetClose}>
                  <Ionicons name="close" size={18} color="#111827" />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.sheetText, rtl]}>{q?.explanation ?? ""}</Text>

                {q && (
                  <View style={{ marginTop: 14 }}>
                    <AskAIButton
                      question={q.question}
                      userAnswer={selected ?? ""}
                      correctAnswer={q.correctAnswer}
                      contextType="quiz"
                    />
                  </View>
                )}
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
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },

  scroll: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingTop: 14 },

  shell: { width: "100%", maxWidth: 1280, alignSelf: "center", gap: 16 },
  shellRow: { flexDirection: "row", alignItems: "flex-start" },
  shellCol: { flexDirection: "column" },

  /* LEFT CARD */
  left: { flex: 1 },
  quizCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qOf: { color: "rgba(17,24,39,0.75)", fontWeight: "900" },
  score: { color: "rgba(47,107,255,0.95)", fontWeight: "900" },
  scoreNum: { color: "#2F6BFF" },

  progressOuter: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(47,107,255,0.12)",
    overflow: "hidden",
  },
  progressInner: { height: "100%", borderRadius: 999, backgroundColor: "#5B35F2" },

  tagsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  tagGreen: { backgroundColor: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.22)" },
  tagTextGreen: { color: "#16A34A", fontWeight: "900" },
  tagPurple: { backgroundColor: "rgba(91,53,242,0.10)", borderColor: "rgba(91,53,242,0.20)" },
  tagTextPurple: { color: "#5B35F2", fontWeight: "900" },

  question: { marginTop: 14, marginBottom: 14, color: "#111827", fontWeight: "900", fontSize: 30, lineHeight: 36 },

  optionBase: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionTextBase: { fontSize: 18, fontWeight: "900" },
  optionIdle: { backgroundColor: "#FFFFFF", borderColor: "rgba(17,24,39,0.15)" },
  optionTextIdle: { color: "#111827" },
  optionSelected: { backgroundColor: "rgba(47,107,255,0.10)", borderColor: "#2F6BFF" },
  optionTextSelected: { color: "#111827" },
  optionCorrect: { backgroundColor: "rgba(34,197,94,0.10)", borderColor: "#22C55E" },
  optionWrong: { backgroundColor: "rgba(220,38,38,0.08)", borderColor: "#EF4444" },
  optionIdleAnswered: { backgroundColor: "rgba(255,255,255,0.6)", borderColor: "rgba(17,24,39,0.10)" },
  optionTextIdleAnswered: { color: "rgba(17,24,39,0.45)" },

  feedbackBanner: { marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1 },
  bannerOk: { backgroundColor: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.25)" },
  bannerBad: { backgroundColor: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.22)" },
  bannerText: { fontWeight: "900", fontSize: 18 },

  bottomRow: { marginTop: 18, flexDirection: "row", gap: 12, justifyContent: "space-between" },

  btnGhost: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.14)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  btnGhostText: { color: "#111827", fontWeight: "900", fontSize: 16 },

  btnPrimary: {
    flex: 1,
    backgroundColor: "#5B35F2",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },

  /* DONE */
  doneWrap: { paddingTop: 16, paddingBottom: 10 },
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
  doneScore: { color: "rgba(255,255,255,0.92)", fontWeight: "900", fontSize: 16 },

  miniBarOuter: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  miniBarInner: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FFD54A",
  },

  confettiRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  doneCardsRow: { marginTop: 14, flexDirection: "row", gap: 12 },
  smallCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.92)",
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

  targetsText: { color: "rgba(17,24,39,0.75)", fontWeight: "900" },
  targetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(251,191,36,0.18)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.28)",
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

  doneExitBtn: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.14)",
  },
  doneExitText: { color: "#111827", fontWeight: "900", fontSize: 16 },

  /* RIGHT AI PANEL */
  right: { flex: 1 },
  aiCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    height: "100%",
    minHeight: 560,
  },
  aiHeader: {
    backgroundColor: "#3C5CFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  aiSub: { color: "rgba(255,255,255,0.9)", fontWeight: "800", marginTop: 2 },

  aiBody: { flex: 1, backgroundColor: "#F4F7FF" },
  aiEmpty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18 },
  aiBotCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#6B6BFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  aiEmptyTitle: { color: "#111827", fontWeight: "900", fontSize: 20, textAlign: "center" },
  aiEmptySub: { marginTop: 8, color: "rgba(17,24,39,0.70)", fontWeight: "800", textAlign: "center", lineHeight: 20 },

  aiExplainBtn: {
    marginTop: 14,
    backgroundColor: "#3C5CFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  aiExplainText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  aiAnswer: { color: "#111827", fontWeight: "800", lineHeight: 20 },

  aiInputRow: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.14)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontWeight: "800",
    color: "#111827",
  },
  aiSendBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#7EA2FF", alignItems: "center", justifyContent: "center" },
  aiLightBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#5B35F2", alignItems: "center", justifyContent: "center" },

  /* MOBILE EXPLAIN BTN */
  mobileExplainBtn: {
    backgroundColor: "#3C5CFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  mobileExplainText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  /* SHEET */
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.30)", justifyContent: "center", padding: 16 },
  sheetCard: { backgroundColor: "#fff", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", maxHeight: "80%" },
  sheetTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sheetTitle: { fontWeight: "900", color: "#111827", fontSize: 16 },
  sheetClose: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(17,24,39,0.06)", alignItems: "center", justifyContent: "center" },
  sheetText: { color: "#111827", fontWeight: "800", lineHeight: 20 },
});
