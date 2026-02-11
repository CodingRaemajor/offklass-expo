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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import ChatBubble from "../../components/ChatBubble";
import { callAI, type Message } from "../../lib/ai.local";
import {
  loadJSON,
  saveJSON,
  ONBOARD_KEY,
  type OnboardingData,
} from "../../lib/storage";

const UI = {
  bg: "#0B0E14",
  card: "#0F1421",
  cardElevated: "#101727",
  cardBorder: "#1C2740",
  text: "#E6EAF2",
  subtext: "#9AA5B1",
  accent: "#7C3AED",
  accentOutline: "#4C2AC8",
  inputBg: "#0F1628",
  inputBorder: "#22304A",
};

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"] as const;
type Lang = (typeof LANGS)[number];

const L10N: Record<Lang, any> = {
  English: {
    title: "Offklass AI",
    subtitle: "Ask questions. Get friendly help.",
    placeholder: "Type your question…",
    greeting: "Hi! I'm Offklass AI. Tell me your grade and what you'd like to learn today 🤗",
    aiBusy: "⚠️ AI is busy. Try again!",
    fallback: "I couldn't think of an answer 😅",
  },
  नेपाली: {
    title: "अफक्लास एआई",
    subtitle: "प्रश्न सोध्नुहोस्। सजिलै सहयोग पाउनुहोस्।",
    placeholder: "आफ्नो प्रश्न टाइप गर्नुहोस्…",
    greeting: "नमस्ते! म Offklass AI हुँ। आफ्नो कक्षा र आज के सिक्न चाहनुहुन्छ भन्नुहोस् 🤗",
    aiBusy: "⚠️ एआई व्यस्त छ। फेरि प्रयास गर्नुहोस्!",
    fallback: "म जवाफ सोच्न सकिनँ 😅",
  },
  اردو: {
    title: "آف کلاس اے آئی",
    subtitle: "سوال پوچھیں۔ دوستانہ مدد پائیں۔",
    placeholder: "اپنا سوال لکھیں…",
    greeting: "سلام! میں Offklass AI ہوں۔ اپنی جماعت اور آج کیا سیکھنا چاہتے ہیں بتائیں 🤗",
    aiBusy: "⚠️ اے آئی مصروف ہے۔ دوبارہ کوشش کریں!",
    fallback: "میں جواب سوچ نہیں سکا 😅",
  },
  বাংলা: {
    title: "অফক্লাস এআই",
    subtitle: "প্রশ্ন করুন। বন্ধুসুলভ সহায়তা পান।",
    placeholder: "আপনার প্রশ্ন লিখুন…",
    greeting: "হাই! আমি Offklass AI। আপনার ক্লাস ও আজ কী শিখতে চান বলুন 🤗",
    aiBusy: "⚠️ এআই ব্যস্ত। আবার চেষ্টা করুন!",
    fallback: "আমি কোনো উত্তর ভাবতে পারিনি 😅",
  },
  हिन्दी: {
    title: "ऑफक्लास एआई",
    subtitle: "प्रश्न पूछें। दोस्ताना मदद पाएँ।",
    placeholder: "اپنا प्रश्न लिखें…",
    greeting: "हाय! मैं ऑफक्लास एआई हूँ। अपनी कक्षा और आज क्या सीखना चाहते हैं बताइए 🤗",
    aiBusy: "⚠️ एआई व्यस्त है। फिर से प्रयास करें!",
    fallback: "मैं उत्तर नहीं सोच पाया 😅",
  },
};

const STORE_KEY = "chat:offklass";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err?: any }> {
  constructor(props: any) {
    super(props);
    this.state = {};
  }
  static getDerivedStateFromError(err: any) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: UI.text }}>Something went wrong</Text>
            <Text style={{ color: UI.subtext, marginTop: 8 }}>{String(this.state.err?.message ?? this.state.err)}</Text>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

export default function OffklassAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang], [lang]);

  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string; question?: string; userAnswer?: string; correctAnswer?: string; }>();
  const lastQuestionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const ob = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const savedLang = (ob?.language as Lang) || "English";
      setLang((LANGS as readonly string[]).includes(savedLang) ? savedLang : "English");

      const defaults: Message[] = [{ id: "greet1", role: "assistant", content: (L10N[savedLang] ?? L10N.English).greeting }];
      const saved = await loadJSON<unknown>(STORE_KEY, defaults);
      const arr = Array.isArray(saved) ? (saved as any[]) : defaults;
      setMessages(arr.map(m => ({
        id: String(m?.id ?? Date.now()),
        role: m?.role === "user" || m?.role === "assistant" ? m.role : "assistant",
        content: typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? ""),
      })).slice(-100));
    })();
  }, []);

  useEffect(() => { saveJSON(STORE_KEY, messages); }, [messages]);

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
      "Please explain step by step how to solve this in a simple way for my grade level. Also show me where I might make mistakes and how to check my answer."
    ];
    setInput(lines.filter(l => l !== "").join("\n"));
  }, [params.question]);

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(m => [...m, userMsg, { id: Date.now() + "-typing", role: "assistant", content: "…" }]);
    setSending(true);

    try {
      const reply = await callAI([...messages.slice(-3), userMsg]);
      setMessages(m => m.map(msg => msg.id.endsWith("-typing") ? { 
        ...msg, 
        id: String(Date.now()), 
        content: typeof reply.content === "string" ? reply.content.trim() : T.fallback 
      } : msg));
    } catch {
      setMessages(m => m.map(msg => msg.id.endsWith("-typing") ? { ...msg, id: Date.now() + "-err", content: T.aiBusy } : msg));
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {/* Header */}
          <View style={styles.headerWrap}>
            <View style={styles.headerCard}>
              <View style={styles.headerTopRow}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={18} color={UI.text} />
                </Pressable>
                <View style={styles.headerTitleWrap}>
                  <View style={styles.headerAccentDot} />
                  <Text style={styles.title}>{T.title}</Text>
                  <Text style={styles.subtitle}>{T.subtitle}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Chat List */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
                <ChatBubble role={item.role === "user" ? "user" : "assistant"} text={item.content} />
              </View>
            )}
            contentContainerStyle={[
              styles.listContent,
              messages.length === 0 && { flex: 1 } // Centers empty state
            ]}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCard}>
                  <Ionicons name="chatbubbles-outline" size={22} color={UI.subtext} />
                  <Text style={styles.emptyTitle}>Start a conversation</Text>
                  <Text style={styles.emptyHint}>Tell me your grade and topic. I'll guide you.</Text>
                </View>
              </View>
            }
          />

          {/* Input Area */}
          <View style={[styles.inputOuter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder={T.placeholder}
                placeholderTextColor={UI.subtext}
                value={input}
                onChangeText={setInput}
                multiline
              />
              <Pressable 
                onPress={onSend} 
                disabled={sending || !input.trim()} 
                style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.4 }]}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  headerCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.cardBorder,
  },
  headerTopRow: { flexDirection: "row", alignItems: "center" },
  backButton: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    marginRight: 8, backgroundColor: "#020617",
    borderWidth: 1, borderColor: UI.cardBorder,
  },
  headerTitleWrap: { flex: 1 },
  headerAccentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: UI.accent, marginBottom: 4 },
  title: { color: UI.text, fontSize: 18, fontWeight: "800" },
  subtitle: { color: UI.subtext, fontSize: 12 },

  listContent: { paddingBottom: 20, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  emptyCard: {
    backgroundColor: UI.card, borderRadius: 16,
    borderWidth: 1, borderColor: UI.cardBorder,
    padding: 20, alignItems: "center", gap: 6,
  },
  emptyTitle: { color: UI.text, fontWeight: "700" },
  emptyHint: { color: UI.subtext, fontSize: 12, textAlign: 'center' },

  inputOuter: { paddingHorizontal: 12, backgroundColor: UI.bg, paddingTop: 8 },
  inputCard: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: 8, backgroundColor: UI.cardElevated,
    borderRadius: 16, borderWidth: 1, borderColor: UI.cardBorder,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: UI.inputBg, color: UI.text,
    borderRadius: 12, borderWidth: 1, borderColor: UI.inputBorder,
    fontSize: 15,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: UI.accent, alignItems: "center", justifyContent: "center",
  },
});