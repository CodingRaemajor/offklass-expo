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
import { loadJSON } from "../../lib/storage";

type Card = { id: string; front: string; back: string; topic?: string };

const SEED: Card[] = [
  { id: "1", front: "What is 3/4 + 1/2?", back: "1¼ (or 5/4)", topic: "Fractions" },
  { id: "2", front: "Convert 0.75 to a fraction.", back: "3/4", topic: "Decimals" },
  { id: "3", front: "If x + 7 = 15, what is x?", back: "8", topic: "Algebra" },
  { id: "4", front: "Area of rectangle: 5cm × 3cm?", back: "15 cm²", topic: "Geometry" },
  { id: "5", front: "0.25 as a percentage?", back: "25%", topic: "Decimals" },
];

export default function Flashcards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  const flip = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);
  const rotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const rotateYBack = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  useEffect(() => {
    (async () => {
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
      Alert.alert("Great job!", "You've gone through all the flashcards!");
      resetSession();
    }
  }
  function prevCard() {
    if (current > 0) {
      resetFlip();
      setCurrent((i) => i - 1);
    }
  }
  function mark(isCorrect: boolean) {
    if (!currentCard) return;
    if (!completed.includes(currentCard.id)) {
      setCompleted((s) => [...s, currentCard.id]);
      isCorrect ? setCorrect((n) => n + 1) : setIncorrect((n) => n + 1);
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
        <Text style={s.h1}>🧠 Flashcard Fun!</Text>
        <Text style={s.sub}>Tap to flip. Use buttons to navigate.</Text>
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
          <Text style={s.label}>Question</Text>
          <Text style={s.big}>{currentCard?.front ?? "—"}</Text>
          {!!currentCard?.topic && <Text style={s.topic}>Topic: {currentCard.topic}</Text>}
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            s.card,
            s.cardBack,
            { transform: [{ perspective: 1000 }, { rotateY: rotateYBack }], backfaceVisibility: "hidden" as any },
          ]}
        >
          <Text style={s.label}>Answer</Text>
          <Text style={s.big}>{currentCard?.back ?? "—"}</Text>
          {!!currentCard?.topic && <Text style={s.topic}>Topic: {currentCard.topic}</Text>}
        </Animated.View>
      </View>

      {/* Controls */}
      <View style={s.row}>
        <TouchableOpacity disabled={current === 0} onPress={prevCard} style={[s.btn, s.btnBlue, current === 0 && s.disabled]}>
          <Text style={s.btnTxt}>◀ Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onShowAnswer} style={[s.btn, s.btnPurple]}>
          <Text style={s.btnTxt}>{showBack ? "Hide Answer" : "Show Answer"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={nextCard} style={[s.btn, s.btnBlue]}>
          <Text style={s.btnTxt}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Correct / Incorrect */}
      {showBack && (
        <View style={[s.row, { marginTop: 8 }]}>
          <TouchableOpacity onPress={() => mark(true)} style={[s.btn, s.btnGreen, { flex: 1 }]}>
            <Text style={s.btnTxt}>✔ I Got It</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => mark(false)} style={[s.btn, s.btnRed, { flex: 1 }]}>
            <Text style={s.btnTxt}>✖ Needs Practice</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={s.statsCard}>
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>{correct}</Text>
            <Text style={s.statLbl}>Correct</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statNum}>{incorrect}</Text>
            <Text style={s.statLbl}>Incorrect</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statNum}>{completed.length}</Text>
            <Text style={s.statLbl}>Completed</Text>
          </View>
        </View>
        <View style={s.progressOuter}>
          <View style={[s.progressInner, { width: `${progressPct}%` }]} />
        </View>
        <View style={s.row}>
          <Text style={s.progressText}>{progressPct}%</Text>
          <TouchableOpacity onPress={() => resetSession()} style={[s.btn, s.btnGray, { flex: 0 }]}>
            <Text style={s.btnTxt}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0B1220" },
  h1: { fontSize: 24, fontWeight: "900", color: "white" },
  sub: { color: "#A5B4FC", marginTop: 4 },
  cardWrap: { height: 260, marginVertical: 12, alignItems: "center", justifyContent: "center" },
  card: {
    position: "absolute", width: "100%", maxWidth: 520, height: 240, borderRadius: 24,
    padding: 16, borderWidth: 2, borderColor: "rgba(147, 51, 234, 0.5)",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardBack: { borderColor: "rgba(59, 130, 246, 0.5)" },
  label: { color: "#fff", opacity: 0.9, fontWeight: "800", marginBottom: 6 },
  big: { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center" },
  topic: { position: "absolute", bottom: 12, right: 16, color: "#D1D5DB", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "white", fontWeight: "800" },
  btnBlue: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  btnPurple: { backgroundColor: "#7C3AED", borderColor: "#8B5CF6" },
  btnGreen: { backgroundColor: "#16A34A", borderColor: "#22C55E" },
  btnRed: { backgroundColor: "#DC2626", borderColor: "#EF4444" },
  btnGray: { backgroundColor: "#374151", borderColor: "#6B7280" },
  disabled: { opacity: 0.5 },
  statsCard: { backgroundColor: "rgba(17,24,39,0.6)", borderRadius: 24, padding: 16, borderWidth: 2, borderColor: "#16A34A", marginTop: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  stat: { alignItems: "center" },
  statNum: { fontSize: 22, color: "white", fontWeight: "900" },
  statLbl: { color: "#9CA3AF" },
  progressOuter: { height: 10, borderRadius: 999, backgroundColor: "#1F2937", overflow: "hidden" },
  progressInner: { height: "100%", backgroundColor: "#3B82F6" },
  progressText: { color: "white", fontWeight: "800" },
});