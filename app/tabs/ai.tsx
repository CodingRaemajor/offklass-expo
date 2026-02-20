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
import { callAI, type Message } from "../../lib/ai.local";
import { loadJSON, saveJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";

/* --------------------------- Light “Teacher” UI --------------------------- */

const UI = {
  bg: "#EEF4FF",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  subtext: "rgba(17,24,39,0.65)",
  muted: "rgba(17,24,39,0.45)",
  purple: "#5B35F2",
  blue: "#2F6BFF",
  green: "#16A34A",
  red: "#DC2626",
  inputBg: "#FFFFFF",
  inputBorder: "rgba(17,24,39,0.14)",
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
    title: "Offklass Teacher",
    subtitle: "Your friendly study coach",
    placeholder: "Type your question…",
    greeting: "Hi! I’m your Offklass Teacher. Tell me your grade and what you want to learn today.",
    aiBusy: "AI is busy. Try again!",
    fallback: "I couldn’t think of an answer.",
    tipLabel: "Tip",
    tipTitle: "Quick Tips",
    tipSub: "Tap a tip to paste it into your message.",
    startTitle: "Start learning",
    startHint: "Tell me your grade + topic. I’ll teach you step by step.",
  },
  नेपाली: {
    title: "Offklass शिक्षक",
    subtitle: "तपाईंको मैत्री अध्ययन कोच",
    placeholder: "आफ्नो प्रश्न टाइप गर्नुहोस्…",
    greeting: "नमस्ते! म Offklass शिक्षक हुँ। आफ्नो कक्षा र आज के सिक्न चाहनुहुन्छ भन्नुहोस्।",
    aiBusy: "एआई व्यस्त छ। फेरि प्रयास गर्नुहोस्!",
    fallback: "म जवाफ सोच्न सकिनँ।",
    tipLabel: "टिप",
    tipTitle: "छिटो टिप्स",
    tipSub: "टिप ट्याप गर्दा मेसेजमा टाँसिन्छ।",
    startTitle: "सिकाइ सुरु गर्नुहोस्",
    startHint: "आफ्नो कक्षा + विषय भन्नुहोस्। म सजिलै बुझाइदिन्छु।",
  },
  اردو: {
    title: "Offklass ٹیچر",
    subtitle: "آپ کا دوستانہ اسٹڈی کوچ",
    placeholder: "اپنا سوال لکھیں…",
    greeting: "سلام! میں آپ کا Offklass ٹیچر ہوں۔ اپنی جماعت اور آج کیا سیکھنا چاہتے ہیں بتائیں۔",
    aiBusy: "اے آئی مصروف ہے۔ دوبارہ کوشش کریں!",
    fallback: "میں جواب نہیں سوچ سکا۔",
    tipLabel: "ٹپ",
    tipTitle: "فوری ٹپس",
    tipSub: "کسی ٹپ پر ٹیپ کریں—پیغام میں آ جائے گا۔",
    startTitle: "سیکھنا شروع کریں",
    startHint: "اپنی جماعت + ٹاپک بتائیں۔ میں آسانی سے سمجھاؤں گا۔",
  },
  বাংলা: {
    title: "Offklass শিক্ষক",
    subtitle: "আপনার বন্ধুসুলভ স্টাডি কোচ",
    placeholder: "আপনার প্রশ্ন লিখুন…",
    greeting: "হাই! আমি আপনার Offklass শিক্ষক। আপনার ক্লাস ও আজ কী শিখতে চান বলুন।",
    aiBusy: "এআই ব্যস্ত। আবার চেষ্টা করুন!",
    fallback: "আমি উত্তর ভাবতে পারিনি।",
    tipLabel: "টিপ",
    tipTitle: "দ্রুত টিপস",
    tipSub: "টিপ ট্যাপ করলে মেসেজে বসে যাবে।",
    startTitle: "শেখা শুরু করুন",
    startHint: "আপনার ক্লাস + টপিক বলুন। আমি ধাপে ধাপে শিখাবো।",
  },
  हिन्दी: {
    title: "Offklass Teacher",
    subtitle: "आपका friendly study coach",
    placeholder: "Type your question…",
    greeting: "हाय! मैं आपका Offklass Teacher हूँ। अपनी कक्षा और आज क्या सीखना चाहते हैं बताइए।",
    aiBusy: "AI busy है। फिर से try करें!",
    fallback: "मैं answer नहीं सोच पाया।",
    tipLabel: "Tip",
    tipTitle: "Quick Tips",
    tipSub: "Tip पर tap करो—message में paste हो जाएगा।",
    startTitle: "Start learning",
    startHint: "Grade + topic बताओ। मैं step-by-step पढ़ाऊँगा।",
  },
};

const STORE_KEY = "chat:offklass";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err?: any }> {
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
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: UI.text }}>Something went wrong</Text>
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

function getTips(lang: Lang): TipItem[] {
  // Keep tips mostly English but simple (works across languages even if UI language changes).
  // If you want, we can fully translate each tip per language next.
  return [
    {
      key: "steps",
      title: "Ask for steps",
      text: `Explain step by step. Use small steps and simple words for my grade.`,
      icon: "list",
    },
    {
      key: "mistakes",
      title: "Common mistakes",
      text: `Show common mistakes and how to avoid them.`,
      icon: "alert-circle",
    },
    {
      key: "check",
      title: "Quick check",
      text: `After solving, show a quick way to check the answer.`,
      icon: "checkmark-done",
    },
    {
      key: "example",
      title: "One example",
      text: `Give one similar example and solve it too.`,
      icon: "copy",
    },
    {
      key: "quizme",
      title: "Quiz me",
      text: `Ask me 3 quick questions on this topic and tell me if I'm right.`,
      icon: "help-circle",
    },
    {
      key: "simpler",
      title: "Make it simpler",
      text: `Explain it even simpler, like I'm new to this.`,
      icon: "sparkles",
    },
  ];
}

export default function OffklassAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();

  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang], [lang]);
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

  const [composerH, setComposerH] = useState(78);

  /* ------------------------------ Tip popup state ------------------------------ */
  const [tipOpen, setTipOpen] = useState(false);
  const tipFade = useRef(new Animated.Value(0)).current;
  const tipScale = useRef(new Animated.Value(0.96)).current;

  function openTips() {
    setTipOpen(true);
    tipFade.setValue(0);
    tipScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(tipFade, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(tipScale, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
    ]).start();
  }

  function closeTips() {
    Animated.parallel([
      Animated.timing(tipFade, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(tipScale, { toValue: 0.98, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setTipOpen(false));
  }

  function applyTip(text: string) {
    setInput((prev) => {
      const base = prev.trim();
      if (!base) return text;
      // Add spacing if user already typed something
      return `${base}\n\n${text}`;
    });
    closeTips();
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
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
      const defaults: Message[] = [greet];

      const saved = await loadJSON<unknown>(STORE_KEY, defaults);
      const arr = Array.isArray(saved) ? (saved as any[]) : defaults;

      setMessages(
        arr
          .map((m) => ({
            id: String(m?.id ?? Date.now()),
            role: m?.role === "user" || m?.role === "assistant" ? m.role : "assistant",
            content: typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? ""),
          }))
          .slice(-120)
      );

      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
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

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, [params.question]);

  function replaceTypingBubbleWith(text: string) {
    setMessages((m) =>
      m.map((msg) => (msg.id.endsWith("-typing") ? { ...msg, id: String(Date.now()), content: text } : msg))
    );
  }

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };

    setMessages((m) => [...m, userMsg, { id: `${Date.now()}-typing`, role: "assistant", content: "…" }]);

    setSending(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);

    try {
      const reply = await callAI([...messages.slice(-3), userMsg]);
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

  const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";
  const keyboardOffset = Platform.OS === "ios" ? 0 : 0;

  const tips = useMemo(() => getTips(lang), [lang]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardBehavior as any} keyboardVerticalOffset={keyboardOffset}>
          {/* Header (Teacher UI) */}
          <View style={styles.headerWrap}>
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.9 }]}>
                  <Ionicons name="arrow-back" size={18} color={UI.text} />
                </Pressable>

                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <View style={styles.teacherBadge}>
                      <Ionicons name="school" size={16} color="#fff" />
                    </View>
                    <Text style={[styles.title, rtl]}>{T.title}</Text>
                  </View>
                  <Text style={[styles.subtitle, rtl]}>{T.subtitle}</Text>
                </View>

                <Pressable onPress={openTips} style={({ pressed }) => [styles.tipPill, pressed && { opacity: 0.92 }]}>
                  <Ionicons name="bulb" size={14} color={UI.purple} />
                  <Text style={styles.tipPillText}>{T.tipLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Chat List */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
                <ChatBubble role={item.role === "user" ? "user" : "assistant"} text={item.content} />
              </View>
            )}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: composerH + Math.max(12, insets.bottom + 10) },
              messages.length === 0 && { flex: 1 },
            ]}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={22} color={UI.purple} />
                  </View>
                  <Text style={[styles.emptyTitle, rtl]}>{T.startTitle}</Text>
                  <Text style={[styles.emptyHint, rtl]}>{T.startHint}</Text>
                </View>
              </View>
            }
          />

          {/* Input Area (stays ABOVE keyboard) */}
          <View
            style={[styles.composerOuter, { paddingBottom: Math.max(10, insets.bottom + 10) }]}
            onLayout={(e) => setComposerH(Math.max(70, Math.ceil(e.nativeEvent.layout.height)))}
          >
            <View style={styles.composerCard}>
              <View style={styles.composerLeft}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, rtl]}
                    placeholder={T.placeholder}
                    placeholderTextColor={UI.muted}
                    value={input}
                    onChangeText={setInput}
                    multiline
                  />
                </View>
              </View>

              <Pressable
                onPress={onSend}
                disabled={sending || !input.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (sending || !input.trim()) && { opacity: 0.45 },
                  pressed && { opacity: 0.92 },
                ]}
              >
                {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#FFFFFF" />}
              </Pressable>
            </View>
          </View>

          {/* TIP POPUP */}
          <Modal visible={tipOpen} transparent animationType="none" onRequestClose={closeTips}>
            <Pressable style={styles.tipBackdrop} onPress={closeTips}>
              <Animated.View
                style={[
                  styles.tipModal,
                  {
                    opacity: tipFade,
                    transform: [{ scale: tipScale }],
                  },
                ]}
              >
                <View style={styles.tipTop}>
                  <View style={styles.tipTopLeft}>
                    <View style={styles.tipIcon}>
                      <Ionicons name="bulb" size={16} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.tipTitle}>{T.tipTitle}</Text>
                      <Text style={styles.tipSub}>{T.tipSub}</Text>
                    </View>
                  </View>

                  <Pressable onPress={closeTips} style={styles.tipClose}>
                    <Ionicons name="close" size={18} color={UI.text} />
                  </Pressable>
                </View>

                <View style={{ marginTop: 12, gap: 10 }}>
                  {tips.map((t) => (
                    <Pressable key={t.key} onPress={() => applyTip(t.text)} style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.92 }]}>
                      <View style={styles.tipRowIcon}>
                        <Ionicons name={t.icon} size={16} color={UI.purple} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tipRowTitle}>{t.title}</Text>
                        <Text style={styles.tipRowText} numberOfLines={2}>
                          {t.text}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={20} color={UI.green} />
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            </Pressable>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  headerCard: {
    backgroundColor: UI.card,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  teacherBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: UI.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: UI.text, fontSize: 16, fontWeight: "900" },
  subtitle: { color: UI.subtext, fontSize: 12, fontWeight: "800", marginTop: 2 },

  tipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(91,53,242,0.10)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.18)",
  },
  tipPillText: { color: UI.purple, fontWeight: "900", fontSize: 12 },

  listContent: { flexGrow: 1 },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 30 },
  emptyCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(91,53,242,0.10)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: UI.text, fontWeight: "900", fontSize: 16 },
  emptyHint: { color: UI.subtext, fontWeight: "800", fontSize: 12, textAlign: "center", lineHeight: 18 },

  /* Composer */
  composerOuter: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: UI.bg },
  composerCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 10,
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  composerLeft: { flexDirection: "row", alignItems: "flex-end", gap: 10, flex: 1 },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: UI.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: UI.inputBg,
    color: UI.text,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.inputBorder,
    fontSize: 15,
    fontWeight: "800",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: UI.purple,
    alignItems: "center",
    justifyContent: "center",
  },

  /* TIP MODAL */
  tipBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "center",
    padding: 16,
  },
  tipModal: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  tipTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tipTopLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  tipIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: UI.purple, alignItems: "center", justifyContent: "center" },
  tipTitle: { color: UI.text, fontWeight: "900", fontSize: 16 },
  tipSub: { color: UI.subtext, fontWeight: "800", marginTop: 2, fontSize: 12 },
  tipClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: UI.border,
  },

  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tipRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(91,53,242,0.10)",
    borderWidth: 1,
    borderColor: "rgba(91,53,242,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipRowTitle: { color: UI.text, fontWeight: "900" },
  tipRowText: { color: UI.subtext, fontWeight: "800", marginTop: 2, fontSize: 12, lineHeight: 16 },
});