import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "../../lib/colors";

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

export default function Quizzes() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

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
        <Text style={s.h1}>🎯 Quiz Challenge!</Text>
        <Text style={s.sub}>Test your knowledge and earn points!</Text>
      </View>

      {!done ? (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>
              Question {current + 1} of {quizQuestions.length}
            </Text>
            <Text style={s.topic}>Topic: {q.topic}</Text>
          </View>

          <View style={{ padding: 16 }}>
            <Text style={s.question}>{q.question}</Text>

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
                    <Text style={[s.optionTxt, { color: txt }]}>{opt}</Text>
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
                  <Text style={s.btnTxt}>Submit Answer</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPress={next} style={[s.btn, s.btnNext]}>
                    <Text style={s.btnTxt}>Next Question ▶</Text>
                  </TouchableOpacity>

                  <Text style={s.feedback}>
                    {selected === q.correctAnswer ? "✅ Correct!" : "❌ Incorrect."}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={[s.card, s.center]}>
          <Text style={s.doneTitle}>Quiz Completed!</Text>
          <Text style={s.doneScore}>
            You scored <Text style={{ color: "#34D399", fontWeight: "900" }}>{score}</Text> out of{" "}
            <Text style={{ fontWeight: "900" }}>{quizQuestions.length}</Text>!
          </Text>
          <TouchableOpacity onPress={restart} style={[s.btn, s.btnReplay]}>
            <Text style={s.btnTxt}>⟳ Play Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress */}
      <View style={s.statsCard}>
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>{score}</Text>
            <Text style={s.statLbl}>Score</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statNum}>{current + (done ? 0 : 1)}</Text>
            <Text style={s.statLbl}>Current</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statNum}>{quizQuestions.length}</Text>
            <Text style={s.statLbl}>Total</Text>
          </View>
        </View>
        <View style={s.progressOuter}>
          <View style={[s.progressInner, { width: `${progressPct}%` }]} />
        </View>
        <Text style={s.progressText}>{progressPct}%</Text>
      </View>
    </View>
  );
}

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