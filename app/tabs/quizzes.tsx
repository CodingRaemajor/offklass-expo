import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Colors } from "../../lib/colors";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { AskAIButton } from "../../components/AskAIButton";
import { NextStepFooter } from "../../components/NextStepFooter";

/* ----------------------------- Quiz Data ---------------------------- */

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  explanation: string;
};

const BASE_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "If you have 2 hundreds blocks, 4 tens blocks, and 7 ones blocks, what number do they represent?",
    options: ["247", "274", "427", "742"],
    correctAnswer: "247",
    topic: "Place Value Blocks",
    explanation:
      "Count each type of block: 2 hundreds = 200, 4 tens = 40, 7 ones = 7. Add them together: 200 + 40 + 7 = 247.",
  },
  {
    id: 2,
    question: "In the number 5,372, what is the value of the digit 3?",
    options: ["3", "30", "300", "3,000"],
    correctAnswer: "300",
    topic: "Place Value Tables",
    explanation:
      "The digit 3 is in the hundreds place. So its value is 3 × 100 = 300.",
  },
  {
    id: 3,
    question: "What is the place value of 7 in the number 47,856?",
    options: ["Ones", "Tens", "Hundreds", "Thousands"],
    correctAnswer: "Thousands",
    topic: "Finding Place Value",
    explanation:
      "Looking at 47,856 from right to left: 6 is ones, 5 is tens, 8 is hundreds, 7 is thousands.",
  },
  {
    id: 4,
    question: "Using the digits 3, 8, 1, 5, what is the largest number you can make?",
    options: ["1358", "3158", "5831", "8531"],
    correctAnswer: "8531",
    topic: "Creating the Largest Number",
    explanation:
      "To make the largest number, put the biggest digits in the highest place values: 8 in thousands, 5 in hundreds, 3 in tens, 1 in ones = 8,531.",
  },
  {
    id: 5,
    question: "In a place value chart, what number is shown by: Ten-thousands: 4, Thousands: 0, Hundreds: 6, Tens: 2, Ones: 9?",
    options: ["40,629", "46,290", "4,629", "406,290"],
    correctAnswer: "40,629",
    topic: "Place Value Tables",
    explanation:
      "Read from left to right: 4 in ten-thousands = 40,000, 0 in thousands = 0, 6 in hundreds = 600, 2 in tens = 20, 9 in ones = 9. Total: 40,629.",
  },
  {
    id: 6,
    question: "How many tens blocks would you need to represent the number 340?",
    options: ["3", "4", "34", "40"],
    correctAnswer: "4",
    topic: "Place Value Blocks",
    explanation:
      "340 = 3 hundreds + 4 tens + 0 ones. So you need 4 tens blocks (the digit in the tens place).",
  },
  {
    id: 7,
    question: "What is the expanded form of 6,258?",
    options: ["6 + 2 + 5 + 8", "6,000 + 200 + 50 + 8", "6 × 1000 + 2 × 100", "62 + 58"],
    correctAnswer: "6,000 + 200 + 50 + 8",
    topic: "Finding Place Value",
    explanation:
      "Break down each digit by its place value: 6 is in thousands (6,000), 2 is in hundreds (200), 5 is in tens (50), 8 is in ones (8).",
  },
  {
    id: 8,
    question: "If you arrange the digits 2, 9, 4, 7 to make the smallest possible number, what do you get?",
    options: ["2479", "2749", "4279", "7942"],
    correctAnswer: "2479",
    topic: "Creating the Largest Number",
    explanation:
      "To make the smallest number, put the smallest digits in the highest place values: 2 in thousands, 4 in hundreds, 7 in tens, 9 in ones = 2,479.",
  },
  {
    id: 9,
    question: "In the number 80,456, what role does the zero play?",
    options: ["It has no value", "It's a placeholder", "It means 80", "It's an error"],
    correctAnswer: "It's a placeholder",
    topic: "Place Value Tables",
    explanation:
      "The zero is a placeholder in the thousands position, showing that there are no thousands. Without it, the number would be 8,456 instead of 80,456.",
  },
  {
    id: 10,
    question: "If you have 1 thousand block, 0 hundred blocks, 3 ten blocks, and 5 one blocks, what number is represented?",
    options: ["135", "1,035", "1,305", "10,35"],
    correctAnswer: "1,035",
    topic: "Place Value Blocks",
    explanation:
      "Count the blocks: 1 thousand = 1,000, 0 hundreds = 0, 3 tens = 30, 5 ones = 5. Total: 1,000 + 0 + 30 + 5 = 1,035.",
  },
  {
    id: 11,
    question: "Which of these numbers has a 5 in the tens place?",
    options: ["5,432", "2,453", "3,254", "4,325"],
    correctAnswer: "3,254",
    topic: "Finding Place Value",
    explanation:
      "In 3,254: 3 is thousands, 2 is hundreds, 5 is tens, 4 is ones. Only 3,254 has 5 in the tens place.",
  },
  {
    id: 12,
    question: "Using digits 9, 2, 6, 0, what's the largest 4-digit number you can create?",
    options: ["9620", "9602", "9260", "9026"],
    correctAnswer: "9620",
    topic: "Creating the Largest Number",
    explanation:
      "Arrange from largest to smallest: 9 (thousands), 6 (hundreds), 2 (tens), 0 (ones) = 9,620.",
  },
];

/* ------------------------------- Lightweight i18n ------------------------------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    questionOf: (a: number, b: number) => string;
    topic: string;
    submit: string;
    next: string;
    correct: string;
    incorrect: string;
    doneTitle: string;
    doneScore: (s: number, t: number) => string;
    playAgain: string;
    score: string;
    current: string;
    total: string;
    progressSuffix: string;
    explanationTitle: string;
    needsPracticeLabel: string;
    practiceModeLabel: string;
  }
> = {
  English: {
    title: "🎯 Place Value Quiz!",
    subtitle: "Master place value concepts and earn points!",
    questionOf: (a, b) => `Question ${a} of ${b}`,
    topic: "Topic",
    submit: "Submit Answer",
    next: "Next Question ▶",
    correct: "✅ Correct!",
    incorrect: "❌ Incorrect.",
    doneTitle: "Quiz Completed!",
    doneScore: (s, t) => `You scored ${s} out of ${t}!`,
    playAgain: "⟳ Play Again",
    score: "Score",
    current: "Current",
    total: "Total",
    progressSuffix: "%",
    explanationTitle: "Why this answer is correct",
    needsPracticeLabel: "Mark as Needs Practice",
    practiceModeLabel: "Practice questions marked 'Needs Practice'",
  },
  नेपाली: {
    title: "🎯 स्थानीय मूल्य क्विज!",
    subtitle: "स्थानीय मूल्य अवधारणाहरू सिक्नुहोस् र अंक कमाउनुहोस्!",
    questionOf: (a, b) => `प्रश्न ${a} / ${b}`,
    topic: "विषय",
    submit: "उत्तर पठाउनुहोस्",
    next: "अर्को प्रश्न ▶",
    correct: "✅ सहि!",
    incorrect: "❌ गलत।",
    doneTitle: "क्विज समाप्त!",
    doneScore: (s, t) => `तपाईंले ${t} मध्ये ${s} अंक प्राप्त गर्नुभयो!`,
    playAgain: "⟳ फेरि खेल्नुहोस्",
    score: "अंक",
    current: "हालको",
    total: "जम्मा",
    progressSuffix: "%",
    explanationTitle: "यो उत्तर किन सहि हो",
    needsPracticeLabel: "पुन: अभ्यास चाहिन्छ भनेर चिन्ह लगाउनुहोस्",
    practiceModeLabel:
      "'पुन: अभ्यास' चिन्हित प्रश्नहरू मात्र अभ्यास गर्नुहोस्",
  },
  اردو: {
    title: "🎯 مقامی قدر کوئز!",
    subtitle: "مقامی قدر کی تصورات سیکھیں اور پوائنٹس حاصل کریں!",
    questionOf: (a, b) => `سوال ${a} از ${b}`,
    topic: "موضوع",
    submit: "جواب جمع کریں",
    next: "اگلا سوال ▶",
    correct: "✅ درست!",
    incorrect: "❌ غلط۔",
    doneTitle: "کوئز مکمل!",
    doneScore: (s, t) => `آپ نے ${t} میں سے ${s} اسکور کیا!`,
    playAgain: "⟳ دوبارہ کھیلیں",
    score: "اسکور",
    current: "موجودہ",
    total: "کل",
    progressSuffix: "%",
    explanationTitle: "یہ جواب کیوں درست ہے",
    needsPracticeLabel: "مزید مشق کے لیے نشان زد کریں",
    practiceModeLabel:
      "صرف ان سوالات کی مشق کریں جن پر 'مزید مشق' لگا ہے",
  },
  বাংলা: {
    title: "🎯 স্থানীয় মান কুইজ!",
    subtitle: "স্থানীয় মানের ধারণা শিখুন এবং পয়েন্ট অর্জন করুন!",
    questionOf: (a, b) => `প্রশ্ন ${a} / ${b}`,
    topic: "বিষয়",
    submit: "উত্তর জমা দিন",
    next: "পরবর্তী প্রশ্ন ▶",
    correct: "✅ সঠিক!",
    incorrect: "❌ ভুল।",
    doneTitle: "কুইজ সম্পন্ন!",
    doneScore: (s, t) => `আপনি ${t} এর মধ্যে ${s} পেয়েছেন!`,
    playAgain: "⟳ আবার খেলুন",
    score: "স্কোর",
    current: "বর্তমান",
    total: "মোট",
    progressSuffix: "%",
    explanationTitle: "এই উত্তরটি কেন সঠিক",
    needsPracticeLabel: "আরও অনুশীলনের জন্য চিহ্নিত করুন",
    practiceModeLabel: "শুধু 'প্র্যাকটিস দরকার' চিহ্নিত প্রশ্নগুলো অনুশীলন করুন",
  },
  हिन्दी: {
    title: "🎯 स्थानीय मान क्विज़!",
    subtitle: "स्थानीय मान की अवधारणाएं सीखें और पॉइंट्स कमाएँ!",
    questionOf: (a, b) => `प्रश्न ${a} / ${b}`,
    topic: "विषय",
    submit: "उत्तर भेजें",
    next: "अगला प्रश्न ▶",
    correct: "✅ सही!",
    incorrect: "❌ गलत।",
    doneTitle: "क्विज़ पूरा!",
    doneScore: (s, t) => `आपने ${t} में से ${s} स्कोर किया!`,
    playAgain: "⟳ फिर से खेलें",
    score: "स्कोर",
    current: "वर्तमान",
    total: "कुल",
    progressSuffix: "%",
    explanationTitle: "यह उत्तर सही क्यों है",
    needsPracticeLabel: "'अधिक अभ्यास' के लिए चिन्हित करें",
    practiceModeLabel:
      "सिर्फ उन्हीं प्रश्नों का अभ्यास करें जिन पर 'अधिक अभ्यास' लगा है",
  },
};

export default function Quizzes() {
  // active questions (can change for Needs Practice mode)
  const [questions, setQuestions] = useState<QuizQuestion[]>(BASE_QUESTIONS);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [needsPracticeIds, setNeedsPracticeIds] = useState<number[]>([]);

  // language (loaded from onboarding)
  const [lang, setLang] = useState<Lang>("English");

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const l = (saved?.language as Lang) || "English";
      setLang(LANGS.includes(l) ? l : "English");
    })();
  }, []);

  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? { writingDirection: "rtl" as "rtl", textAlign: "right" as const }
    : undefined;

  const q = questions[current];
  const total = questions.length;

  function selectOption(opt: string) {
    if (isAnswered || done) return;
    setSelected(opt);
  }

  function submit() {
    if (selected == null || isAnswered || done) return;
    setIsAnswered(true);
    if (selected === q.correctAnswer) {
      setScore((s) => s + 1);
    }
  }

  function next() {
    if (!isAnswered) return;
    if (current < total - 1) {
      setCurrent((i) => i + 1);
      setSelected(null);
      setIsAnswered(false);
    } else {
      setDone(true);
    }
  }

  function restart() {
    setQuestions(BASE_QUESTIONS);
    setCurrent(0);
    setSelected(null);
    setIsAnswered(false);
    setScore(0);
    setDone(false);
    // keep needsPracticeIds so they can still practice them later
  }

  function markNeedsPractice() {
    if (!needsPracticeIds.includes(q.id)) {
      setNeedsPracticeIds((ids) => [...ids, q.id]);
    }
  }

  function startNeedsPracticeMode() {
    const practiceQuestions = BASE_QUESTIONS.filter((qq) =>
      needsPracticeIds.includes(qq.id)
    );
    if (practiceQuestions.length === 0) {
      return;
    }
    setQuestions(practiceQuestions);
    setCurrent(0);
    setSelected(null);
    setIsAnswered(false);
    setScore(0);
    setDone(false);
  }

  const progressPct = useMemo(
    () =>
      Math.round(
        ((done ? total : current) / (total === 0 ? 1 : total)) * 100
      ),
    [current, done, total]
  );

  return (
    <View style={s.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        overScrollMode="never"
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Text style={[s.h1, rtl]}>{T.title}</Text>
          <Text style={[s.sub, rtl]}>{T.subtitle}</Text>
        </View>

        {!done ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={[s.cardTitle, rtl]}>
                {T.questionOf(current + 1, total)}
              </Text>
              <Text style={[s.topic, rtl]}>
                {T.topic}: {q.topic}
              </Text>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={[s.question, rtl]}>{q.question}</Text>

              <View style={{ gap: 10, marginTop: 14 }}>
                {q.options.map((opt) => {
                  const isCorrect = opt === q.correctAnswer;
                  const isSelected = selected === opt;

                  let bg = "rgba(31,41,55,0.6)"; // idle
                  let border = "#374151";
                  let txt = "#E5E7EB";

                  if (!isAnswered && isSelected) {
                    bg = "#EA580C";
                    border = "#F59E0B";
                    txt = "#FFFFFF";
                  }

                  if (isAnswered) {
                    if (isCorrect) {
                      bg = "#16A34A";
                      border = "#22C55E";
                      txt = "#FFFFFF";
                    } else if (isSelected && !isCorrect) {
                      bg = "#DC2626";
                      border = "#EF4444";
                      txt = "#FFFFFF";
                    } else {
                      bg = "rgba(55,65,81,0.6)";
                      border = "#4B5563";
                      txt = "#D1D5DB";
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={opt}
                      disabled={isAnswered || done}
                      onPress={() => selectOption(opt)}
                      style={[
                        s.option,
                        { backgroundColor: bg, borderColor: border },
                      ]}
                    >
                      <Text style={[s.optionTxt, { color: txt }, rtl]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Explanation + feedback */}
              {isAnswered && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[s.feedback, rtl]}>
                    {selected === q.correctAnswer
                      ? T.correct
                      : T.incorrect}
                  </Text>
                  <Text style={[s.explanationTitle, rtl]}>
                    {T.explanationTitle}
                  </Text>
                  <Text style={[s.explanation, rtl]}>{q.explanation}</Text>
                </View>
              )}

              {/* Inline Ask Offklass AI */}
              <AskAIButton
                question={q.question}
                userAnswer={selected ?? ""}
                correctAnswer={q.correctAnswer}
                contextType="quiz"
              />

              {/* Actions row */}
              <View style={s.actions}>
                {!isAnswered ? (
                  <TouchableOpacity
                    onPress={submit}
                    disabled={selected == null}
                    style={[
                      s.btn,
                      s.btnSubmit,
                      selected == null && s.disabled,
                    ]}
                  >
                    <Text style={s.btnTxt}>{T.submit}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={next}
                    style={[s.btn, s.btnNext]}
                  >
                    <Text style={s.btnTxt}>{T.next}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={markNeedsPractice}
                  style={[s.btnSmall, s.btnNeedsPractice]}
                >
                  <Text style={s.btnNeedsPracticeTxt}>
                    {T.needsPracticeLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={[s.card, s.center]}>
            <Text style={[s.doneTitle, rtl]}>{T.doneTitle}</Text>
            <Text style={[s.doneScore, rtl]}>
              {T.doneScore(score, total)}
            </Text>
            <TouchableOpacity
              onPress={restart}
              style={[s.btn, s.btnReplay]}
            >
              <Text style={s.btnTxt}>{T.playAgain}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Needs Practice mode toggle */}
        <TouchableOpacity
          style={s.practiceToggle}
          onPress={startNeedsPracticeMode}
        >
          <Text style={s.practiceToggleText}>{T.practiceModeLabel}</Text>
        </TouchableOpacity>

        {/* Progress / Stats */}
        <View style={s.statsCard}>
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statNum}>{score}</Text>
              <Text style={[s.statLbl, rtl]}>{T.score}</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>
                {done ? total : current + 1}
              </Text>
              <Text style={[s.statLbl, rtl]}>{T.current}</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>{total}</Text>
              <Text style={[s.statLbl, rtl]}>{T.total}</Text>
            </View>
          </View>
          <View style={s.progressOuter}>
            <View
              style={[s.progressInner, { width: `${progressPct}%` }]}
            />
          </View>
          <Text style={[s.progressText, rtl]}>
            {progressPct}
            {T.progressSuffix}
          </Text>
        </View>

        {/* Next steps footer when done */}
        {done && (
          <NextStepFooter
            onPlayAgain={restart}
            nextLessonPath="/tabs/lessons"
            nextQuizPath={undefined}
          />
        )}
      </ScrollView>
    </View>
  );
}

/* ---------------------------------- Styles --------------------------------- */

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0B1220" },
  h1: { fontSize: 24, fontWeight: "900", color: "white" },
  sub: { color: "#A5B4FC", marginTop: 4 },

  card: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 2,
    borderColor: "#EA580C",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  cardTitle: { color: "#FB923C", fontWeight: "800", fontSize: 16 },
  topic: { color: "#D1D5DB", marginTop: 4, fontSize: 12 },

  question: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
  },

  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  optionTxt: { fontSize: 16, fontWeight: "700" },

  actions: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 2,
  },
  btnTxt: { color: "#fff", fontWeight: "800" },
  btnSubmit: { backgroundColor: "#EA580C", borderColor: "#F59E0B" },
  btnNext: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  btnReplay: {
    backgroundColor: "#7C3AED",
    borderColor: "#8B5CF6",
    marginTop: 10,
  },

  btnSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnNeedsPractice: {
    borderColor: "#FBBF24",
    backgroundColor: "rgba(251,191,36,0.12)",
  },
  btnNeedsPracticeTxt: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "700",
  },

  feedback: { color: "white", fontWeight: "800", marginTop: 8 },
  explanationTitle: {
    marginTop: 6,
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  explanation: {
    marginTop: 2,
    color: "#D1D5DB",
    fontSize: 13,
  },

  disabled: { opacity: 0.5 },

  statsCard: {
    backgroundColor: "rgba(17,24,39,0.6)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: "#10B981",
    marginTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  stat: { alignItems: "center" },
  statNum: { fontSize: 22, color: "white", fontWeight: "900" },
  statLbl: { color: "#9CA3AF" },

  progressOuter: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1F2937",
    overflow: "hidden",
  },
  progressInner: { height: "100%", backgroundColor: "#3B82F6" },
  progressText: {
    color: "white",
    fontWeight: "800",
    textAlign: "right",
    marginTop: 6,
  },

  doneTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 16,
  },
  doneScore: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginVertical: 12,
  },
  center: { alignItems: "center", paddingVertical: 16 },

  practiceToggle: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.12)",
    alignSelf: "flex-start",
  },
  practiceToggleText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
});