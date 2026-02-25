// app/(tabs)/ai.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import ChatBubble from "../../components/ChatBubble";
import {
  callAI,
  prepareAI,
  getAIStatus,
  subscribeAIStatus,
  type Message,
} from "../../lib/ai.local";
import {
  loadJSON,
  saveJSON,
  ONBOARD_KEY,
  type OnboardingData,
} from "../../lib/storage";

/* --------------------------- Playful “Kid Teacher” UI --------------------------- */

const UI = {
  bg: "#F0F7FF",
  bgAccent: "#E0E7FF",
  card: "rgba(255,255,255,0.95)",
  border: "rgba(0,0,0,0.05)",
  text: "#1E293B",
  subtext: "#64748B",
  muted: "#94A3B8",
  purple: "#7C3AED",
  blue: "#3B82F6",
  yellow: "#F59E0B",
  green: "#10B981",
  red: "#EF4444",
  inputBg: "#F8FAFC",
  inputBorder: "#E2E8F0",
};

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    placeholder: string;
    greeting: string;
    aiBusy: string;
    fallback: string;

    tipLabel: string;
    tipTitle: string;
    tipSub: string;

    startTitle: string;
    startHint: string;
  }
> = {
  English: {
    title: "Offklass Buddy",
    subtitle: "Let's learn together!",
    placeholder: "Ask me anything...",
    greeting:
      "Hi there! 👋 I'm your Offklass Buddy. Tell me your grade and what we're learning today!",
    aiBusy: "Oops! I'm thinking too hard. Try again!",
    fallback: "I couldn't find the answer. Let's try another way!",
    tipLabel: "Ideas",
    tipTitle: "Learning Boosters",
    tipSub: "Tap to add to your message!",
    startTitle: "Ready to Start?",
    startHint: "Tell me your grade + topic. I’ll make it super easy!",
  },
  नेपाली: {
    title: "Offklass साथी",
    subtitle: "सँगै सिकौं!",
    placeholder: "केही सोध्नुहोस्...",
    greeting:
      "नमस्ते! म Offklass शिक्षक हुँ। आफ्नो कक्षा र आज के सिक्न चाहनुहुन्छ भन्नुहोस्।",
    aiBusy: "एआई व्यस्त छ। फेरि प्रयास गर्नुहोस्!",
    fallback: "म जवाफ सोच्न सकिनँ।",
    tipLabel: "टिप",
    tipTitle: "छिटो टिप्स",
    tipSub: "टिप ट्याप गर्दा मेसेजमा टाँसिन्छ।",
    startTitle: "सिकाइ सुरु गर्नुहोस्",
    startHint: "आफ्नो कक्षा + विषय भन्नुहोस्।",
  },
  اردو: {
    title: "Offklass ساتھی",
    subtitle: "آئیے مل کر سیکھتے ہیں!",
    placeholder: "کچھ پوچھیں...",
    greeting:
      "سلام! میں آپ کا Offklass ٹیچر ہوں۔ اپنی جماعت بتائیں۔",
    aiBusy: "اے آئی مصروف ہے۔ دوبارہ کوشش کریں!",
    fallback: "میں جواب نہیں سوچ سکا۔",
    tipLabel: "آئیڈیاز",
    tipTitle: "فوری ٹپس",
    tipSub: "ٹپ پر ٹیپ کریں—پیغام میں آ جائے گا۔",
    startTitle: "سیکھنا شروع کریں",
    startHint: "اپنی جماعت + ٹاپک بتائیں۔",
  },
  বাংলা: {
    title: "Offklass বন্ধু",
    subtitle: "চলো একসাথে শিখি!",
    placeholder: "কিছু জিজ্ঞাসা করো...",
    greeting:
      "হাই! আমি আপনার Offklass শিক্ষক। আপনার ক্লাস ও আজ কী শিখতে চান বলুন।",
    aiBusy: "এআই ব্যস্ত। আবার চেষ্টা করুন!",
    fallback: "আমি উত্তর ভাবতে পারিনি।",
    tipLabel: "টিপস",
    tipTitle: "দ্রুত টিপস",
    tipSub: "টিপ ট্যাপ করলে মেসেজে বসে যাবে।",
    startTitle: "শেখা শুরু করুন",
    startHint: "আপনার ক্লাস + টপিক বলুন।",
  },
  हिन्दी: {
    title: "Offklass Buddy",
    subtitle: "चलो साथ पढ़ते हैं!",
    placeholder: "कुछ भी पूछो...",
    greeting:
      "हाय! मैं आपका Offklass Buddy हूँ। अपनी कक्षा और आज क्या सीखना चाहते हैं बताइए।",
    aiBusy: "AI busy है। फिर से try करें!",
    fallback: "मैं answer नहीं सोच पाया।",
    tipLabel: "Ideas",
    tipTitle: "Quick Tips",
    tipSub: "Tip पर tap करो—message में paste हो जाएगा।",
    startTitle: "Start learning",
    startHint: "Grade + topic बताओ।",
  },
};

const STORE_KEY = "chat:offklass";

/* -------------------------- Decorative Background -------------------------- */

const KidBackground = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View
      style={[
        styles.blob,
        { top: -50, right: -50, backgroundColor: "#DBEAFE", width: 220, height: 220 },
      ]}
    />
    <View
      style={[
        styles.blob,
        { bottom: 110, left: -70, backgroundColor: "#EDE9FE", width: 170, height: 170 },
      ]}
    />
    <View
      style={[
        styles.blob,
        { top: "42%", right: -35, backgroundColor: "#FEF3C7", width: 90, height: 90 },
      ]}
    />
  </View>
);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = {};
  }
  static getDerivedStateFromError(err: any) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }}>
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: UI.red }}>
              Oopsie!
            </Text>
            <Text style={{ color: UI.subtext, marginTop: 8 }}>
              {String(this.state.err?.message ?? this.state.err)}
            </Text>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

/* -------------------------- Tip content (kid friendly) -------------------------- */

type TipItem = { key: string; title: string; text: string; icon: any };

function getTips(_lang: Lang): TipItem[] {
  return [
    {
      key: "steps",
      title: "Step-by-Step",
      text: "Explain this step-by-step using simple words for my grade.",
      icon: "footsteps",
    },
    {
      key: "mistakes",
      title: "Watch Out!",
      text: "What are common mistakes students make with this?",
      icon: "warning",
    },
    {
      key: "example",
      title: "Example",
      text: "Show one example and solve it with me.",
      icon: "bulb",
    },
    {
      key: "check",
      title: "Check it!",
      text: "Show a quick way to check the answer.",
      icon: "checkmark-circle",
    },
    {
      key: "quizme",
      title: "Challenge Me",
      text: "Give me a 3-question mini quiz on this topic!",
      icon: "trophy",
    },
    {
      key: "simpler",
      title: "Simpler!",
      text: "Explain it like I'm new to this (super simple).",
      icon: "happy",
    },
  ];
}

export default function OffklassAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang] ?? L10N.English, [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({ writingDirection: "rtl" as const, textAlign: "right" as const } as const)
    : undefined;

  const router = useRouter();
  const params = useLocalSearchParams<{
    from?: string;
    question?: string;
    userAnswer?: string;
    correctAnswer?: string;
  }>();
  const lastQuestionRef = useRef<string | undefined>(undefined);

  const [composerH, setComposerH] = useState(80);

  /* ------------------------------ Tip popup state ------------------------------ */
  const [tipOpen, setTipOpen] = useState(false);
  const tipFade = useRef(new Animated.Value(0)).current;
  const tipScale = useRef(new Animated.Value(0.9)).current;

  const tips = useMemo(() => getTips(lang), [lang]);

  function openTips() {
    setTipOpen(true);
    tipFade.setValue(0);
    tipScale.setValue(0.9);
    Animated.parallel([
      Animated.timing(tipFade, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(tipScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeTips() {
    Animated.timing(tipFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() =>
      setTipOpen(false)
    );
  }

  function applyTip(text: string) {
    setInput((prev) => {
      const base = prev.trim();
      return base ? `${base}\n\n${text}` : text;
    });
    closeTips();
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  // ✅ AI STATUS GATE (download -> load -> ready)
  const [ai, setAi] = useState(getAIStatus());

  useEffect(() => {
    const unsub = subscribeAIStatus(() => setAi(getAIStatus()));
    // start preparing immediately when tab opens
    prepareAI().catch(() => {});
    return () => {
      unsub();
    };
  }, []);

  const isReady = ai.aiState === "ready";

  // ✅ KEYBOARD FIX
  const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";
  const keyboardOffset = Platform.OS === "ios" ? 0 : Math.max(0, insets.top);

  function onFocusInput() {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }

  useEffect(() => {
    (async () => {
      const ob = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const savedLang = (ob?.language as Lang) || "English";
      setLang((LANGS as readonly string[]).includes(savedLang) ? savedLang : "English");

      const greet: Message = {
        id: "greet1",
        role: "assistant",
        content: (L10N[savedLang] ?? L10N.English).greeting,
      };

      const saved = await loadJSON<unknown>(STORE_KEY, [greet]);
      const arr = Array.isArray(saved) ? (saved as any[]) : [greet];

      setMessages(
        arr
          .map((m) => ({
            id: String(m?.id ?? Date.now()),
            role: m?.role === "user" || m?.role === "assistant" ? m.role : "assistant",
            content: typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? ""),
          }))
          .slice(-120)
      );

      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
    })();
  }, []);

  useEffect(() => {
    saveJSON(STORE_KEY, messages);
  }, [messages]);

  useEffect(() => {
    if (!params.question || lastQuestionRef.current === params.question || input.trim().length > 0) return;
    lastQuestionRef.current = params.question as string;

    const lines = [
      `I'm working on ${params.from === "flashcard" ? "this flashcard" : "this quiz question"} and need help:`,
      "",
      `Question: ${params.question}`,
      `My answer: ${params.userAnswer || "(I'm not sure)"}`,
      params.correctAnswer ? `Correct answer: ${params.correctAnswer}` : "",
      "",
      "Please explain step by step in a simple way for my grade level. Also show common mistakes and a quick way to check the answer.",
    ];
    setInput(lines.filter((l) => l !== "").join("\n"));

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
      inputRef.current?.focus();
    }, 160);
  }, [params.question]);

  function replaceTypingBubbleWith(text: string) {
    setMessages((m) =>
      m.map((msg) =>
        msg.id.endsWith("-typing") ? { ...msg, id: String(Date.now()), content: text } : msg
      )
    );
  }

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;

    // ✅ HARD GATE: don't send while downloading/loading/error
    if (!isReady) return;

    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };

    setMessages((m) => [...m, userMsg, { id: `${Date.now()}-typing`, role: "assistant", content: "..." }]);
    setSending(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);

    try {
      const reply = await callAI([...messages.slice(-4), userMsg]);
      const content =
        typeof reply?.content === "string" && reply.content.trim().length ? reply.content.trim() : T.fallback;
      replaceTypingBubbleWith(content);
    } catch {
      replaceTypingBubbleWith(T.aiBusy);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["top", "left", "right"]}>
        <KidBackground />

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardBehavior as any} keyboardVerticalOffset={keyboardOffset}>
          {/* Header */}
          <View style={styles.headerWrap}>
            <View style={styles.headerCard}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color={UI.text} />
              </Pressable>

              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.title, rtl]}>{T.title}</Text>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: isReady ? UI.green : UI.yellow }]} />
                  <Text style={[styles.subtitle, rtl]}>
                    {isReady
                      ? T.subtitle
                      : ai.aiState === "downloading"
                      ? "Downloading AI…"
                      : ai.aiState === "loading"
                      ? "Loading AI…"
                      : ai.aiState === "error"
                      ? "AI needs retry"
                      : "Preparing…"}
                  </Text>
                </View>
              </View>

              <Pressable onPress={openTips} style={styles.tipPill} hitSlop={10}>
                <Ionicons name="sparkles" size={16} color={UI.purple} />
              </Pressable>
            </View>
          </View>

          {/* Chat */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
                <ChatBubble role={item.role === "user" ? "user" : "assistant"} text={item.content} />
              </View>
            )}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: composerH + Math.max(12, insets.bottom) },
              messages.length === 0 && { flex: 1 },
            ]}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCard}>
                  <Ionicons name="school" size={40} color={UI.purple} />
                  <Text style={[styles.emptyTitle, rtl]}>{T.startTitle}</Text>
                  <Text style={[styles.emptyHint, rtl]}>{T.startHint}</Text>
                </View>
              </View>
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Composer */}
          <View
            style={[styles.composerOuter, { paddingBottom: Math.max(12, insets.bottom) }]}
            onLayout={(e) => setComposerH(Math.max(76, Math.ceil(e.nativeEvent.layout.height)))}
          >
            <View style={styles.composerCard}>
              <TextInput
                ref={inputRef}
                style={[styles.input, rtl]}
                placeholder={isReady ? T.placeholder : "AI is getting ready…"}
                placeholderTextColor={UI.muted}
                value={input}
                onChangeText={setInput}
                onFocus={onFocusInput}
                multiline
                returnKeyType="send"
                blurOnSubmit={false}
                editable={isReady} // ✅ lock typing until ready (prevents kids confusion)
                onSubmitEditing={() => {
                  if (input.trim().length) onSend();
                }}
              />

              <Pressable
                onPress={() => {
                  inputRef.current?.focus();
                  onSend();
                }}
                disabled={sending || !input.trim() || !isReady}
                style={[
                  styles.sendBtn,
                  (sending || !input.trim() || !isReady) && { opacity: 0.5 },
                ]}
              >
                {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="paw" size={20} color="#fff" />}
              </Pressable>
            </View>
          </View>

          {/* Tips Modal */}
          <Modal visible={tipOpen} transparent animationType="fade" onRequestClose={closeTips}>
            <Pressable style={styles.tipBackdrop} onPress={closeTips}>
              <Animated.View style={[styles.tipModal, { opacity: tipFade, transform: [{ scale: tipScale }] }]}>
                <Text style={styles.tipTitle}>{T.tipTitle}</Text>
                <Text style={styles.tipSub}>{T.tipSub}</Text>

                <View style={{ gap: 8, marginTop: 12 }}>
                  {tips.map((t) => (
                    <Pressable key={t.key} onPress={() => applyTip(t.text)} style={styles.tipRow}>
                      <Ionicons name={t.icon} size={20} color={UI.purple} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tipRowTitle}>{t.title}</Text>
                        <Text style={styles.tipRowText} numberOfLines={2}>
                          {t.text}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color={UI.green} />
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            </Pressable>
          </Modal>

          {/* ✅ AI Gate Overlay (download/load/error) */}
          {!isReady && (
            <View style={styles.aiGate} pointerEvents="auto">
              <View style={styles.aiGateCard}>
                <Ionicons name="sparkles" size={26} color={UI.purple} />
                <Text style={styles.aiGateTitle}>
                  {ai.aiState === "downloading"
                    ? "Downloading your AI Buddy… 🧠"
                    : ai.aiState === "loading"
                    ? "Warming up… 🔥"
                    : ai.aiState === "error"
                    ? "AI needs help 🛠️"
                    : "Getting ready…"}
                </Text>

                {ai.aiState === "downloading" && (
                  <Text style={styles.aiGateSub}>
                    {ai.aiProgress ? `${ai.aiProgress.percent.toFixed(1)}%` : "Starting download…"}
                  </Text>
                )}

                {ai.aiState === "loading" && (
                  <Text style={styles.aiGateSub}>Almost ready! Please wait…</Text>
                )}

                {ai.aiState === "error" && (
                  <>
                    <Text style={styles.aiGateSub}>{ai.aiError ?? "Something went wrong."}</Text>
                    <Pressable onPress={() => prepareAI().catch(() => {})} style={styles.retryBtn}>
                      <Ionicons name="refresh" size={18} color="#fff" />
                      <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  blob: { position: "absolute", borderRadius: 999, opacity: 0.55 },

  headerWrap: { padding: 12 },
  headerCard: {
    backgroundColor: UI.card,
    borderRadius: 24,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  title: { fontSize: 18, fontWeight: "900", color: UI.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: UI.green },
  subtitle: { fontSize: 11, fontWeight: "800", color: UI.subtext },

  tipPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
  },

  listContent: { flexGrow: 1, paddingTop: 6 },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 90, paddingHorizontal: 16 },
  emptyCard: {
    backgroundColor: UI.card,
    padding: 28,
    borderRadius: 30,
    alignItems: "center",
    width: "90%",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: UI.text, marginTop: 10 },
  emptyHint: { fontSize: 14, color: UI.subtext, textAlign: "center", marginTop: 6, lineHeight: 20, fontWeight: "700" },

  composerOuter: { paddingHorizontal: 16, backgroundColor: "transparent" },
  composerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: UI.card,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    gap: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
    color: UI.text,
    maxHeight: 110,
    backgroundColor: UI.inputBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.inputBorder,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: UI.purple,
    alignItems: "center",
    justifyContent: "center",
  },

  tipBackdrop: { flex: 1, backgroundColor: "rgba(30,41,59,0.4)", justifyContent: "center", padding: 20 },
  tipModal: { backgroundColor: "#fff", borderRadius: 30, padding: 22, elevation: 20 },
  tipTitle: { fontSize: 18, fontWeight: "900", color: UI.text },
  tipSub: { fontSize: 12, fontWeight: "800", color: UI.subtext, marginTop: 4 },

  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  tipRowTitle: { fontSize: 15, fontWeight: "900", color: UI.text },
  tipRowText: { fontSize: 12, fontWeight: "700", color: UI.subtext, marginTop: 2, lineHeight: 16 },

  // ✅ AI Gate overlay styles
  aiGate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(240,247,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  aiGateCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    padding: 20,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    alignItems: "center",
    gap: 10,
  },
  aiGateTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: UI.text,
    textAlign: "center",
  },
  aiGateSub: {
    fontSize: 13,
    fontWeight: "800",
    color: UI.subtext,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.purple,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  retryText: { color: "#fff", fontWeight: "900" },
});