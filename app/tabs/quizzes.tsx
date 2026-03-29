// app/(tabs)/quizzes.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import {
  generateQuizFromTranscript,
  type GeneratedQuestion,
} from "../../lib/ai.local";
import { LESSON_INFO } from "../../lib/lessonTranscripts";
import { loadJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";
import { AskAIButton } from "../../components/AskAIButton";
import { NextStepFooter } from "../../components/NextStepFooter";

/* -------------------------------- i18n -------------------------------- */

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    chooseUnit: string;
    loadQuiz: string;
    loadingQuiz: string;
    deckLabel: string;
    localLabel: string;
    question: string;
    explanation: string;
    next: string;
    finish: string;
    retry: string;
    practiceWrong: string;
    noWrong: string;
    score: string;
    correct: string;
    wrong: string;
    progress: string;
    readyTitle: string;
    readySub: string;
    failedMsg: string;
    resultTitle: string;
    resultSub: string;
    perfect: string;
    rank: string;
    rankA: string;
    rankB: string;
    rankC: string;
    rankD: string;
    chooseAnswer: string;
    selected: string;
    correctAnswer: string;
    tryAgain: string;
  }
> = {
  English: {
    title: "🎯 Offklass Quiz Challenge",
    subtitle: "Pick a unit, load your local quiz, and test your skills!",
    chooseUnit: "Choose Unit",
    loadQuiz: "Load Quiz",
    loadingQuiz: "Loading...",
    deckLabel: "Quiz",
    localLabel: "Local Bank",
    question: "Question",
    explanation: "Explanation",
    next: "Next",
    finish: "Finish",
    retry: "Play Again",
    practiceWrong: "Practice Wrong Questions",
    noWrong: "Perfect! No wrong questions to practice 🎉",
    score: "Score",
    correct: "Correct",
    wrong: "Wrong",
    progress: "Progress",
    readyTitle: "Ready to Start?",
    readySub: 'Select a unit and tap "Load Quiz".',
    failedMsg: "Quiz library could not be loaded.",
    resultTitle: "Great work!",
    resultSub: "You completed the quiz challenge.",
    perfect: "Perfect score!",
    rank: "Rank",
    rankA: "Legend",
    rankB: "Pro",
    rankC: "Rising Star",
    rankD: "Keep Going",
    chooseAnswer: "Choose one answer",
    selected: "Selected",
    correctAnswer: "Correct Answer",
    tryAgain: "Try Again",
  },
  नेपाली: {
    title: "🎯 Offklass क्विज चुनौती",
    subtitle: "युनिट छान्नुहोस्, लोकल क्विज लोड गर्नुहोस्, र आफ्नो सीप जाँच्नुहोस्!",
    chooseUnit: "युनिट छान्नुहोस्",
    loadQuiz: "क्विज लोड गर्नुहोस्",
    loadingQuiz: "लोड हुँदैछ...",
    deckLabel: "क्विज",
    localLabel: "लोकल बैंक",
    question: "प्रश्न",
    explanation: "व्याख्या",
    next: "अर्को",
    finish: "समाप्त",
    retry: "फेरि खेल्नुहोस्",
    practiceWrong: "गलत प्रश्नहरूको अभ्यास गर्नुहोस्",
    noWrong: "एकदम राम्रो! अभ्यासका लागि गलत प्रश्न छैन 🎉",
    score: "अंक",
    correct: "सही",
    wrong: "गलत",
    progress: "प्रगति",
    readyTitle: "सुरु गर्न तयार?",
    readySub: 'युनिट छान्नुहोस् र "क्विज लोड गर्नुहोस्" थिच्नुहोस्।',
    failedMsg: "क्विज लाइब्रेरी लोड हुन सकेन।",
    resultTitle: "धेरै राम्रो!",
    resultSub: "तपाईंले क्विज चुनौती पूरा गर्नुभयो।",
    perfect: "पूर्ण अंक!",
    rank: "र्‍याङ्क",
    rankA: "लेजेंड",
    rankB: "प्रो",
    rankC: "राइजिङ स्टार",
    rankD: "जारी राख्नुहोस्",
    chooseAnswer: "एउटा उत्तर छान्नुहोस्",
    selected: "छानिएको",
    correctAnswer: "सही उत्तर",
    tryAgain: "फेरि प्रयास गर्नुहोस्",
  },
  اردو: {
    title: "🎯 Offklass کوئز چیلنج",
    subtitle: "یونٹ منتخب کریں، لوکل کوئز لوڈ کریں، اور اپنی مہارت آزمائیں!",
    chooseUnit: "یونٹ منتخب کریں",
    loadQuiz: "کوئز لوڈ کریں",
    loadingQuiz: "لوڈ ہو رہا ہے...",
    deckLabel: "کوئز",
    localLabel: "لوکل بینک",
    question: "سوال",
    explanation: "وضاحت",
    next: "اگلا",
    finish: "ختم",
    retry: "دوبارہ کھیلیں",
    practiceWrong: "غلط سوالات کی مشق کریں",
    noWrong: "زبردست! مشق کے لیے کوئی غلط سوال نہیں 🎉",
    score: "اسکور",
    correct: "صحیح",
    wrong: "غلط",
    progress: "پیش رفت",
    readyTitle: "شروع کرنے کے لیے تیار؟",
    readySub: 'یونٹ منتخب کریں اور "کوئز لوڈ کریں" دبائیں۔',
    failedMsg: "کوئز لائبریری لوڈ نہیں ہو سکی۔",
    resultTitle: "بہت خوب!",
    resultSub: "آپ نے کوئز چیلنج مکمل کر لیا۔",
    perfect: "کامل اسکور!",
    rank: "رینک",
    rankA: "لیجنڈ",
    rankB: "پرو",
    rankC: "رائزنگ اسٹار",
    rankD: "جاری رکھیں",
    chooseAnswer: "ایک جواب منتخب کریں",
    selected: "منتخب شدہ",
    correctAnswer: "صحیح جواب",
    tryAgain: "دوبارہ کوشش کریں",
  },
  বাংলা: {
    title: "🎯 Offklass কুইজ চ্যালেঞ্জ",
    subtitle: "ইউনিট বেছে নাও, লোকাল কুইজ লোড করো, আর নিজের স্কিল দেখাও!",
    chooseUnit: "ইউনিট বেছে নাও",
    loadQuiz: "কুইজ লোড করো",
    loadingQuiz: "লোড হচ্ছে...",
    deckLabel: "কুইজ",
    localLabel: "লোকাল ব্যাংক",
    question: "প্রশ্ন",
    explanation: "ব্যাখ্যা",
    next: "পরেরটি",
    finish: "শেষ",
    retry: "আবার খেলো",
    practiceWrong: "ভুল প্রশ্নগুলো প্র্যাকটিস করো",
    noWrong: "দারুণ! প্র্যাকটিসের জন্য কোনো ভুল প্রশ্ন নেই 🎉",
    score: "স্কোর",
    correct: "সঠিক",
    wrong: "ভুল",
    progress: "অগ্রগতি",
    readyTitle: "শুরু করতে প্রস্তুত?",
    readySub: 'ইউনিট বেছে নিয়ে "কুইজ লোড করো" চাপো।',
    failedMsg: "কুইজ লাইব্রেরি লোড করা যায়নি।",
    resultTitle: "দারুণ কাজ!",
    resultSub: "তুমি কুইজ চ্যালেঞ্জ শেষ করেছ।",
    perfect: "পারফেক্ট স্কোর!",
    rank: "র‍্যাঙ্ক",
    rankA: "লেজেন্ড",
    rankB: "প্রো",
    rankC: "রাইজিং স্টার",
    rankD: "চালিয়ে যাও",
    chooseAnswer: "একটি উত্তর বেছে নাও",
    selected: "নির্বাচিত",
    correctAnswer: "সঠিক উত্তর",
    tryAgain: "আবার চেষ্টা করো",
  },
  हिन्दी: {
    title: "🎯 Offklass क्विज चैलेंज",
    subtitle: "यूनिट चुनो, लोकल क्विज लोड करो, और अपनी स्किल टेस्ट करो!",
    chooseUnit: "यूनिट चुनो",
    loadQuiz: "क्विज लोड करो",
    loadingQuiz: "लोड हो रहा है...",
    deckLabel: "क्विज",
    localLabel: "लोकल बैंक",
    question: "प्रश्न",
    explanation: "समझ",
    next: "अगला",
    finish: "समाप्त",
    retry: "फिर से खेलो",
    practiceWrong: "गलत प्रश्नों का अभ्यास करो",
    noWrong: "शानदार! अभ्यास के लिए कोई गलत प्रश्न नहीं 🎉",
    score: "स्कोर",
    correct: "सही",
    wrong: "गलत",
    progress: "प्रगति",
    readyTitle: "शुरू करने के लिए तैयार?",
    readySub: 'यूनिट चुनो और "क्विज लोड करो" दबाओ।',
    failedMsg: "क्विज लाइब्रेरी लोड नहीं हो सकी।",
    resultTitle: "बहुत बढ़िया!",
    resultSub: "तुमने क्विज चैलेंज पूरा किया।",
    perfect: "परफेक्ट स्कोर!",
    rank: "रैंक",
    rankA: "लेजेंड",
    rankB: "प्रो",
    rankC: "राइजिंग स्टार",
    rankD: "चलते रहो",
    chooseAnswer: "एक उत्तर चुनो",
    selected: "चुना गया",
    correctAnswer: "सही उत्तर",
    tryAgain: "फिर से कोशिश करो",
  },
};

/* -------------------------------- helpers -------------------------------- */

function getAllUnits(): string[] {
  return Array.from(new Set(LESSON_INFO.map((item) => item.unit))).filter(Boolean);
}

function cloneQuestions(items: GeneratedQuestion[]): GeneratedQuestion[] {
  return items.map((q) => ({
    ...q,
    options: [...q.options],
  }));
}

function starsForPct(p: number) {
  if (p >= 90) return 5;
  if (p >= 75) return 4;
  if (p >= 55) return 3;
  if (p >= 35) return 2;
  return 1;
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, n));
}

function rankLabelForPct(pct: number, T: (typeof L10N)["English"]) {
  if (pct >= 90) return T.rankA;
  if (pct >= 75) return T.rankB;
  if (pct >= 55) return T.rankC;
  return T.rankD;
}

/* -------------------------------- component -------------------------------- */

export default function Quizzes() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  const unitTitles = useMemo(() => getAllUnits(), []);
  const [selectedUnit, setSelectedUnit] = useState<string>(
    unitTitles[0] ?? "Unit 1: Place Value"
  );

  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({
        writingDirection: "rtl" as const,
        textAlign: "right" as const,
      } as const)
    : undefined;

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [baseQuestions, setBaseQuestions] = useState<GeneratedQuestion[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<GeneratedQuestion[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedQuiz, setHasLoadedQuiz] = useState(false);

  const [mode, setMode] = useState<"quiz" | "practice">("quiz");

  useEffect(() => {
    (async () => {
      const onboarding = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const savedLang = (onboarding?.language as Lang) || "English";
      setLang(LANGS.includes(savedLang) ? savedLang : "English");
    })();
  }, []);

  const currentQuestion = questions[currentIndex] ?? null;
  const total = questions.length;
  const progressPct = total ? Math.round((currentIndex / total) * 100) : 0;
  const resultPct =
    correctCount + wrongCount === 0
      ? 0
      : Math.round((correctCount / (correctCount + wrongCount)) * 100);

  const stars = starsForPct(resultPct);
  const rank = rankLabelForPct(resultPct, T);
  const rankIcon =
    resultPct >= 90
      ? "trophy"
      : resultPct >= 75
      ? "medal"
      : resultPct >= 55
      ? "ribbon"
      : "sparkles";

  async function loadQuiz(unit: string) {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setHasLoadedQuiz(true);

      const quiz = await generateQuizFromTranscript("", unit, unit);
      const cleanQuiz = cloneQuestions(quiz);

      if (!cleanQuiz.length) {
        throw new Error("No quiz items found.");
      }

      setBaseQuestions(cleanQuiz);
      setQuestions(cleanQuiz);
      setWrongQuestions([]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setSubmitted(false);
      setCorrectCount(0);
      setWrongCount(0);
      setIsFinished(false);
      setMode("quiz");
    } catch (error) {
      console.log("Quiz load failed:", error);
      Alert.alert(T.resultTitle, T.failedMsg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelect(answer: string) {
    if (submitted) return;
    setSelectedAnswer(answer);
  }

  function handleSubmitOrNext() {
    if (!currentQuestion) return;

    if (!submitted) {
      if (!selectedAnswer) {
        Alert.alert(T.question, T.chooseAnswer);
        return;
      }

      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      setSubmitted(true);

      if (isCorrect) {
        setCorrectCount((n) => n + 1);
      } else {
        setWrongCount((n) => n + 1);
        setWrongQuestions((prev) => {
          if (prev.find((q) => q.id === currentQuestion.id)) return prev;
          return [...prev, currentQuestion];
        });
      }

      return;
    }

    const isLast = currentIndex >= questions.length - 1;

    if (isLast) {
      setIsFinished(true);
      return;
    }

    setCurrentIndex((n) => n + 1);
    setSelectedAnswer(null);
    setSubmitted(false);
  }

  function handleRetryAll() {
    const cloned = cloneQuestions(baseQuestions);
    setQuestions(cloned);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setCorrectCount(0);
    setWrongCount(0);
    setIsFinished(false);
    setMode("quiz");
  }

  function handlePracticeWrong() {
    if (!wrongQuestions.length) {
      Alert.alert(T.resultTitle, T.noWrong);
      return;
    }

    const cloned = cloneQuestions(wrongQuestions);
    setQuestions(cloned);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setCorrectCount(0);
    setWrongCount(0);
    setIsFinished(false);
    setMode("practice");
  }

  const showCorrectAnswer = submitted && selectedAnswer !== currentQuestion?.correctAnswer;

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={["#FFF7D6", "#EAF4FF", "#EEFDF4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.bg}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: Math.max(18, insets.bottom + 18),
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <Text style={[s.title, rtl]}>{T.title}</Text>
            <Text style={[s.subtitle, rtl]}>{T.subtitle}</Text>

            <View style={s.unitBox}>
              <Text style={[s.sectionLabel, rtl]}>{T.chooseUnit}</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.unitRow}
              >
                {unitTitles.map((unit, idx) => {
                  const active = selectedUnit === unit;
                  return (
                    <TouchableOpacity
                      key={`${unit}-${idx}`}
                      onPress={() => setSelectedUnit(unit)}
                      style={[s.unitChip, active && s.unitChipActive]}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.unitChipText, active && s.unitChipTextActive]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                onPress={() => loadQuiz(selectedUnit)}
                disabled={isLoading}
                style={[s.loadBtn, isLoading && s.disabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="book-outline" size={18} color="#fff" />
                )}
                <Text style={s.loadBtnText}>
                  {isLoading ? T.loadingQuiz : T.loadQuiz}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.statsRow}>
              <View style={s.pill}>
                <Ionicons name="help-circle-outline" size={14} color="#2F6BFF" />
                <Text style={s.pillText}>
                  {T.progress}: {currentIndex}/{questions.length}
                </Text>
              </View>

              <View style={s.pill}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#16A34A" />
                <Text style={s.pillText}>
                  {T.correct}: {correctCount}
                </Text>
              </View>

              <View style={s.pill}>
                <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
                <Text style={s.pillText}>
                  {T.wrong}: {wrongCount}
                </Text>
              </View>

              {hasLoadedQuiz && (
                <View style={s.pill}>
                  <Ionicons name="library-outline" size={14} color="#5B35F2" />
                  <Text style={s.pillText}>{T.localLabel}</Text>
                </View>
              )}
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

          {!hasLoadedQuiz ? (
            <View style={s.readyCard}>
              <Ionicons name="school-outline" size={44} color="#5B35F2" />
              <Text style={[s.readyTitle, rtl]}>{T.readyTitle}</Text>
              <Text style={[s.readySub, rtl]}>{T.readySub}</Text>
            </View>
          ) : isLoading ? (
            <View style={s.readyCard}>
              <ActivityIndicator size="large" color="#5B35F2" />
              <Text style={[s.readyTitle, rtl, { marginTop: 12 }]}>{T.loadingQuiz}</Text>
            </View>
          ) : !isFinished && currentQuestion ? (
            <View>
              <View style={[s.quizCard, isTablet && { padding: 22 }]}>
                <View style={s.quizHeaderRow}>
                  <View style={s.tag}>
                    <Text style={s.tagText}>
                      {mode === "practice" ? T.practiceWrong : T.deckLabel}
                    </Text>
                  </View>

                  <View style={[s.tag, s.topicTag]}>
                    <Text style={s.topicTagText} numberOfLines={1}>
                      {currentQuestion.topic}
                    </Text>
                  </View>
                </View>

                <Text style={[s.questionLabel, rtl]}>
                  {T.question} {currentIndex + 1}
                </Text>
                <Text style={[s.questionText, rtl]}>{currentQuestion.question}</Text>

                <View style={{ marginTop: 16, gap: 10 }}>
                  {currentQuestion.options.map((option, idx) => {
                    const isPicked = selectedAnswer === option;
                    const isCorrect = option === currentQuestion.correctAnswer;

                    let optionStyle = s.optionBtn;
                    let optionTextStyle = s.optionText;

                    if (submitted && isCorrect) {
                      optionStyle = [s.optionBtn, s.optionCorrect] as any;
                      optionTextStyle = [s.optionText, s.optionTextActive] as any;
                    } else if (submitted && isPicked && !isCorrect) {
                      optionStyle = [s.optionBtn, s.optionWrong] as any;
                      optionTextStyle = [s.optionText, s.optionTextActive] as any;
                    } else if (isPicked) {
                      optionStyle = [s.optionBtn, s.optionSelected] as any;
                      optionTextStyle = [s.optionText, s.optionTextSelected] as any;
                    }

                    return (
                      <TouchableOpacity
                        key={`${option}-${idx}`}
                        onPress={() => handleSelect(option)}
                        disabled={submitted}
                        activeOpacity={0.9}
                        style={optionStyle}
                      >
                        <View style={s.optionLeft}>
                          <View style={[s.optionBadge, isPicked && s.optionBadgeSelected]}>
                            <Text
                              style={[
                                s.optionBadgeText,
                                isPicked && s.optionBadgeTextSelected,
                              ]}
                            >
                              {String.fromCharCode(65 + idx)}
                            </Text>
                          </View>
                          <Text style={[optionTextStyle, rtl]}>{option}</Text>
                        </View>

                        {submitted && isCorrect ? (
                          <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                        ) : submitted && isPicked && !isCorrect ? (
                          <Ionicons name="close-circle" size={22} color="#DC2626" />
                        ) : isPicked ? (
                          <Ionicons name="radio-button-on" size={20} color="#5B35F2" />
                        ) : (
                          <Ionicons name="radio-button-off" size={20} color="#94A3B8" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!submitted && (
                  <Text style={[s.chooseHint, rtl]}>{T.chooseAnswer}</Text>
                )}

                {submitted && (
                  <View style={s.explanationBox}>
                    <Text style={[s.explanationLabel, rtl]}>{T.explanation}</Text>
                    <Text style={[s.explanationText, rtl]}>
                      {currentQuestion.explanation}
                    </Text>

                    {showCorrectAnswer && (
                      <Text style={[s.correctAnswerText, rtl]}>
                        {T.correctAnswer}: {currentQuestion.correctAnswer}
                      </Text>
                    )}
                  </View>
                )}

                {submitted && (
                  <View style={{ marginTop: 12 }}>
                    <AskAIButton
                      question={currentQuestion.question}
                      userAnswer={selectedAnswer ?? ""}
                      correctAnswer={currentQuestion.correctAnswer}
                      contextType="quiz"
                    />
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={handleSubmitOrNext} style={s.nextBtn}>
                <Ionicons
                  name={submitted && currentIndex === questions.length - 1 ? "flag" : "arrow-forward"}
                  size={18}
                  color="#fff"
                />
                <Text style={s.nextBtnText}>
                  {!submitted
                    ? T.selected
                    : currentIndex === questions.length - 1
                    ? T.finish
                    : T.next}
                </Text>
              </TouchableOpacity>
            </View>
          ) : hasLoadedQuiz && isFinished ? (
            <View>
              <LinearGradient
                colors={["#FF7A59", "#FFB703", "#2F6BFF", "#5B35F2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.resultBanner}
              >
                <View style={s.resultTopRow}>
                  <View style={s.resultBadge}>
                    <Ionicons name={rankIcon as any} size={18} color="#111827" />
                    <Text style={s.resultBadgeText}>
                      {T.rank}: {rank}
                    </Text>
                  </View>

                  <View style={s.starRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < stars ? "star" : "star-outline"}
                        size={18}
                        color="#FFD54A"
                      />
                    ))}
                  </View>
                </View>

                <Text style={[s.resultTitle, rtl]}>{T.resultTitle}</Text>
                <Text style={[s.resultSub, rtl]}>{T.resultSub}</Text>

                <View style={s.resultScoreRow}>
                  <View style={s.bigScorePill}>
                    <Text style={s.bigScoreText}>{resultPct}%</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[s.resultMeta, rtl]}>
                      {T.correct}: {correctCount} • {T.wrong}: {wrongCount}
                    </Text>
                    <View style={s.miniBarOuter}>
                      <View
                        style={[s.miniBarInner, { width: `${clampPct(resultPct)}%` }]}
                      />
                    </View>
                  </View>
                </View>

                {resultPct === 100 && (
                  <Text style={[s.perfectText, rtl]}>{T.perfect}</Text>
                )}
              </LinearGradient>

              <View style={s.finishActions}>
                <TouchableOpacity onPress={handleRetryAll} style={s.retryBtn}>
                  <Ionicons name="reload" size={18} color="#fff" />
                  <Text style={s.retryBtnText}>{T.retry}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePracticeWrong} style={s.practiceBtn}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={s.practiceBtnText}>{T.practiceWrong}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 12 }}>
                <NextStepFooter
                  onPlayAgain={handleRetryAll}
                  nextLessonPath="/tabs/lessons"
                  nextQuizPath="/tabs/flashcards"
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

/* -------------------------------- styles -------------------------------- */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#EAF4FF" },
  bg: { flex: 1 },

  header: { alignItems: "center", marginBottom: 10 },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(17,24,39,0.70)",
    textAlign: "center",
  },

  unitBox: {
    width: "100%",
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  unitRow: { gap: 10, paddingRight: 4 },
  unitChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.05)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    marginRight: 8,
  },
  unitChipActive: {
    backgroundColor: "rgba(91,53,242,0.12)",
    borderColor: "rgba(91,53,242,0.28)",
  },
  unitChipText: {
    color: "#111827",
    fontWeight: "800",
  },
  unitChipTextActive: {
    color: "#5B35F2",
    fontWeight: "900",
  },
  loadBtn: {
    marginTop: 12,
    backgroundColor: "#5B35F2",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  loadBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  disabled: { opacity: 0.5 },

  statsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  pillText: {
    color: "#111827",
    fontWeight: "900",
  },

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
  progressInner: {
    height: "100%",
    borderRadius: 999,
  },

  readyCard: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  readyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  readySub: {
    marginTop: 6,
    color: "rgba(17,24,39,0.7)",
    fontWeight: "700",
    textAlign: "center",
  },

  quizCard: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  quizHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  tag: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(91,53,242,0.10)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.22)",
  },
  tagText: {
    color: "#5B35F2",
    fontWeight: "900",
  },
  topicTag: {
    backgroundColor: "rgba(47,107,255,0.10)",
    borderColor: "rgba(47,107,255,0.22)",
    maxWidth: "62%",
  },
  topicTagText: {
    color: "#2F6BFF",
    fontWeight: "900",
  },

  questionLabel: {
    color: "rgba(17,24,39,0.70)",
    fontWeight: "900",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    color: "#111827",
  },

  optionBtn: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "rgba(148,163,184,0.22)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionSelected: {
    backgroundColor: "rgba(91,53,242,0.08)",
    borderColor: "rgba(91,53,242,0.32)",
  },
  optionCorrect: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  optionWrong: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.30)",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(148,163,184,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionBadgeSelected: {
    backgroundColor: "rgba(91,53,242,0.18)",
  },
  optionBadgeText: {
    color: "#111827",
    fontWeight: "900",
  },
  optionBadgeTextSelected: {
    color: "#5B35F2",
  },
  optionText: {
    flex: 1,
    color: "#111827",
    fontWeight: "800",
    fontSize: 15,
  },
  optionTextSelected: {
    color: "#5B35F2",
  },
  optionTextActive: {
    color: "#111827",
  },

  chooseHint: {
    marginTop: 12,
    color: "rgba(17,24,39,0.62)",
    fontWeight: "800",
  },

  explanationBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
  },
  explanationLabel: {
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },
  explanationText: {
    color: "rgba(17,24,39,0.80)",
    fontWeight: "700",
    lineHeight: 20,
  },
  correctAnswerText: {
    marginTop: 8,
    color: "#16A34A",
    fontWeight: "900",
  },

  nextBtn: {
    marginTop: 14,
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  nextBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },

  resultBanner: {
    marginTop: 14,
    borderRadius: 22,
    padding: 16,
    overflow: "hidden",
  },
  resultTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resultBadgeText: {
    color: "#111827",
    fontWeight: "900",
  },
  starRow: {
    flexDirection: "row",
    gap: 4,
  },
  resultTitle: {
    marginTop: 12,
    color: "#fff",
    fontWeight: "900",
    fontSize: 28,
  },
  resultSub: {
    marginTop: 4,
    color: "rgba(255,255,255,0.94)",
    fontWeight: "800",
  },
  resultScoreRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
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
  bigScoreText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 22,
  },
  resultMeta: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "900",
    fontSize: 16,
  },
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
  perfectText: {
    marginTop: 10,
    color: "#fff",
    fontWeight: "900",
  },

  finishActions: {
    marginTop: 14,
    gap: 10,
  },
  retryBtn: {
    backgroundColor: "#5B35F2",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  practiceBtn: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  practiceBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});