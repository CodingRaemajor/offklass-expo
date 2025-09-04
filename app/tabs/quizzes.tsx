import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "../../lib/colors";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";

/* ----------------------------- Quiz Data (same) ---------------------------- */

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
};

const quizQuestions: QuizQuestion[] = [
  { id: 1, question: "What is the value of 5²?", options: ["10", "25", "50", "5"], correctAnswer: "25", topic: "Exponents" },
  { id: 2, question: "Which fraction is equivalent to 0.8?", options: ["1/2", "3/4", "4/5", "7/10"], correctAnswer: "4/5", topic: "Decimals & Fractions" },
  { id: 3, question: "If a triangle has angles 60°, 70°, what is the third angle?", options: ["50°", "60°", "70°", "80°"], correctAnswer: "50°", topic: "Geometry" },
  { id: 4, question: "Solve for y: y - 12 = 20", options: ["8", "12", "20", "32"], correctAnswer: "32", topic: "Algebra" },
  { id: 5, question: "What is the least common multiple (LCM) of 4 and 6?", options: ["2", "12", "24", "6"], correctAnswer: "12", topic: "Number Theory" },
  { id: 6, question: "What is the product of 1.5 and 4?", options: ["0.6", "6", "60", "0.06"], correctAnswer: "6", topic: "Decimals" },
  { id: 7, question: "How many sides does a hexagon have?", options: ["4", "5", "6", "7"], correctAnswer: "6", topic: "Geometry" },
  { id: 8, question: "What is the ratio of vowels to consonants in the word 'MATH'?", options: ["1:3", "3:1", "2:2", "1:4"], correctAnswer: "1:3", topic: "Ratios" },
  { id: 9, question: "Calculate the mean of these numbers: 10, 20, 30.", options: ["10", "20", "30", "60"], correctAnswer: "20", topic: "Statistics" },
  { id: 10, question: "If you roll a standard six-sided die, what is the probability of rolling an even number?", options: ["1/6", "1/3", "1/2", "2/3"], correctAnswer: "1/2", topic: "Probability" },
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
  }
> = {
  English: {
    title: "🎯 Quiz Challenge!",
    subtitle: "Test your knowledge and earn points!",
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
  },
  नेपाली: {
    title: "🎯 क्विज चुनौती!",
    subtitle: "आफ्नो ज्ञान परीक्षण गर्नुहोस् र अंक कमाउनुहोस्!",
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
  },
  اردو: {
    title: "🎯 کوئز چیلنج!",
    subtitle: "اپنا علم آزمائیں اور پوائنٹس حاصل کریں!",
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
  },
  বাংলা: {
    title: "🎯 কুইজ চ্যালেঞ্জ!",
    subtitle: "জ্ঞান যাচাই করুন এবং পয়েন্ট অর্জন করুন!",
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
  },
  हिन्दी: {
    title: "🎯 क्विज़ चैलेंज!",
    subtitle: "अपना ज्ञान जाँचें और पॉइंट्स कमाएँ!",
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
  },
};

export default function Quizzes() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

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
  const rtl = isRTL ? { writingDirection: "rtl" as "rtl", textAlign: "right" as const } : undefined;

  const q = quizQuestions[current];

  function selectOption(opt: string) {
    if (isAnswered) return;
    setSelected(opt);
  }

  function submit() {
    if (selected == null || isAnswered) return;
    setIsAnswered(true);
    if (selected === q.correctAnswer) setScore((s) => s + 1);
  }

  function next() {
    if (current < quizQuestions.length - 1) {
      setCurrent((i) => i + 1);
      setSelected(null);
      setIsAnswered(false);
    } else {
      setDone(true);
    }
  }

  function restart() {
    setCurrent(0);
    setSelected(null);
    setIsAnswered(false);
    setScore(0);
    setDone(false);
  }

  const progressPct = useMemo(
    () => Math.round(((done ? quizQuestions.length : current) / quizQuestions.length) * 100),
    [current, done]
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Text style={[s.h1, rtl]}>{T.title}</Text>
        <Text style={[s.sub, rtl]}>{T.subtitle}</Text>
      </View>

      {!done ? (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, rtl]}>{T.questionOf(current + 1, quizQuestions.length)}</Text>
            <Text style={[s.topic, rtl]}>{T.topic}: {q.topic}</Text>
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
                  bg = "#EA580C"; // orange-600
                  border = "#F59E0B";
                  txt = "#FFFFFF";
                }

                if (isAnswered) {
                  if (isCorrect) {
                    bg = "#16A34A"; // green
                    border = "#22C55E";
                    txt = "#FFFFFF";
                  } else if (isSelected && !isCorrect) {
                    bg = "#DC2626"; // red
                    border = "#EF4444";
                    txt = "#FFFFFF";
                  } else {
                    bg = "rgba(55,65,81,0.6)"; // dim
                    border = "#4B5563";
                    txt = "#D1D5DB";
                  }
                }

                return (
                  <TouchableOpacity
                    key={opt}
                    disabled={isAnswered}
                    onPress={() => selectOption(opt)}
                    style={[s.option, { backgroundColor: bg, borderColor: border }]}
                  >
                    <Text style={[s.optionTxt, { color: txt }, rtl]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.actions}>
              {!isAnswered ? (
                <TouchableOpacity
                  onPress={submit}
                  disabled={selected == null}
                  style={[s.btn, s.btnSubmit, selected == null && s.disabled]}
                >
                  <Text style={s.btnTxt}>{T.submit}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPress={next} style={[s.btn, s.btnNext]}>
                    <Text style={s.btnTxt}>{T.next}</Text>
                  </TouchableOpacity>

                  <Text style={[s.feedback, rtl]}>
                    {selected === q.correctAnswer ? T.correct : T.incorrect}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={[s.card, s.center]}>
          <Text style={[s.doneTitle, rtl]}>{T.doneTitle}</Text>
          <Text style={[s.doneScore, rtl]}>
            {T.doneScore(score, quizQuestions.length)}
          </Text>
          <TouchableOpacity onPress={restart} style={[s.btn, s.btnReplay]}>
            <Text style={s.btnTxt}>{T.playAgain}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress */}
      <View style={s.statsCard}>
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>{score}</Text>
            <Text style={[s.statLbl, rtl]}>{T.score}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statNum}>{current + (done ? 0 : 1)}</Text>
            <Text style={[s.statLbl, rtl]}>{T.current}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statNum}>{quizQuestions.length}</Text>
            <Text style={[s.statLbl, rtl]}>{T.total}</Text>
          </View>
        </View>
        <View style={s.progressOuter}>
          <View style={[s.progressInner, { width: `${progressPct}%` }]} />
        </View>
        <Text style={[s.progressText, rtl]}>
          {progressPct}{T.progressSuffix}
        </Text>
      </View>
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

  question: { color: "white", fontSize: 20, fontWeight: "800", marginBottom: 10 },

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
  btnReplay: { backgroundColor: "#7C3AED", borderColor: "#8B5CF6", marginTop: 10 },

  feedback: { color: "white", fontWeight: "800" },

  disabled: { opacity: 0.5 },

  statsCard: {
    backgroundColor: "rgba(17,24,39,0.6)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: "#10B981",
    marginTop: 12,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  stat: { alignItems: "center" },
  statNum: { fontSize: 22, color: "white", fontWeight: "900" },
  statLbl: { color: "#9CA3AF" },

  progressOuter: { height: 10, borderRadius: 999, backgroundColor: "#1F2937", overflow: "hidden" },
  progressInner: { height: "100%", backgroundColor: "#3B82F6" },
  progressText: { color: "white", fontWeight: "800", textAlign: "right", marginTop: 6 },

  doneTitle: { color: "white", fontSize: 28, fontWeight: "900", textAlign: "center", marginTop: 16 },
  doneScore: { color: "white", fontSize: 18, textAlign: "center", marginVertical: 12 },
  center: { alignItems: "center", paddingVertical: 16 },
});
