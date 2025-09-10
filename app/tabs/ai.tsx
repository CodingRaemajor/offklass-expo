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
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ChatBubble from "../../components/ChatBubble";
import { callAI, type Message } from "../../lib/ai.local";
import { loadJSON, saveJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";

/* ---------- Hard-set UI to match your dark dashboard (no theme leak) --------- */
const UI = {
  bg: "#0B0E14",            // page background
  card: "#0F1421",          // tile / card
  cardElevated: "#101727",  // input row
  cardBorder: "#1C2740",    // thin border
  text: "#E6EAF2",          // high contrast
  subtext: "#9AA5B1",       // secondary text
  accent: "#7C3AED",        // purple
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
    greeting: "Hi! I’m Offklass AI. Tell me your grade and what you’d like to learn today 🤗",
    aiBusy: "⚠️ AI is busy. Try again!",
    fallback: "I couldn’t think of an answer 😅",
  },
  नेपाली: { title: "अफक्लास एआई", subtitle: "प्रश्न सोध्नुहोस्। सजिलै सहयोग पाउनुहोस्।", placeholder: "आफ्नो प्रश्न टाइप गर्नुहोस्…", greeting: "नमस्ते! म Offklass AI हुँ। आफ्नो कक्षा र आज के सिक्न चाहनुहुन्छ भन्नुहोस् 🤗", aiBusy: "⚠️ एआई व्यस्त छ। फेरि प्रयास गर्नुहोस्!", fallback: "म जवाफ सोच्न सकिनँ 😅" },
  اردو: { title: "آف کلاس اے آئی", subtitle: "سوال پوچھیں۔ دوستانہ مدد پائیں۔", placeholder: "اپنا سوال لکھیں…", greeting: "سلام! میں Offklass AI ہوں۔ اپنی جماعت اور آج کیا سیکھنا چاہتے ہیں بتائیں 🤗", aiBusy: "⚠️ اے آئی مصروف ہے۔ دوبارہ کوشش کریں!", fallback: "میں جواب سوچ نہیں سکا 😅" },
  বাংলা: { title: "অফক্লাস এআই", subtitle: "প্রশ্ন করুন। বন্ধুসুলভ সহায়তা পান।", placeholder: "আপনার প্রশ্ন লিখুন…", greeting: "হাই! আমি Offklass AI। আপনার ক্লাস ও আজ কী শিখতে চান বলুন 🤗", aiBusy: "⚠️ এআই ব্যস্ত। আবার চেষ্টা করুন!", fallback: "আমি কোনো উত্তর ভাবতে পারিনি 😅" },
  हिन्दी: { title: "ऑफक्लास एआई", subtitle: "प्रश्न पूछें। दोस्ताना मदद पाएँ।", placeholder: "اپना प्रश्न लिखें…", greeting: "हाय! मैं Offklass AI हूँ। अपनी कक्षा और आज क्या सीखना चाहते हैं बताइए 🤗", aiBusy: "⚠️ एआई व्यस्त है। फिर से प्रयास करें!", fallback: "मैं उत्तर नहीं सोच पाया 😅" },
};

const STORE_KEY = "chat:offklass";

/* ------------------------------- Error Boundary ------------------------------ */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err?: any }> {
  constructor(props: any) { super(props); this.state = {}; }
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidCatch(err: any, info: any) { console.error("AI screen error:", err, info); }
  render() {
    if ((this.state as any).err) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: UI.text }}>Something went wrong</Text>
            <Text style={{ color: UI.subtext, marginTop: 8 }}>
              {String((this.state as any).err?.message ?? (this.state as any).err)}
            </Text>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

/* -------------------------------- Component -------------------------------- */
export default function OffklassAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();

  // language
  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL ? ({ writingDirection: "rtl" as "rtl", textAlign: "right" as const }) : undefined;

  // Load language then history (so greeting localizes)
  useEffect(() => {
    (async () => {
      const ob = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const savedLang = (ob?.language as Lang) || "English";
      const finalLang = (LANGS as readonly string[]).includes(savedLang) ? savedLang : "English";
      setLang(finalLang);

      const defaults: Message[] = [
        { id: "greet1", role: "assistant", content: (L10N[finalLang] ?? L10N.English).greeting },
      ];
      const saved = await loadJSON<unknown>(STORE_KEY, defaults);
      const arr = Array.isArray(saved) ? (saved as any[]) : defaults;
      const clean: Message[] = arr
        .map((m) => ({
          id: String(m?.id ?? Date.now()),
          role: m?.role === "user" || m?.role === "assistant" ? m.role : "assistant",
          content: typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? ""),
        }))
        .slice(-100);
      setMessages(clean);
    })();
  }, []);

  useEffect(() => { try { saveJSON(STORE_KEY, messages); } catch {} }, [messages]);

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };

    setMessages((m) => [...m, userMsg, { id: Date.now() + "-typing", role: "assistant", content: "…" }]);
    setSending(true);
    try {
      const context = messages.slice(-3);
      const reply = await callAI([...context, userMsg]);
      setMessages((m) =>
        m.map((msg: any) =>
          msg.id.endsWith("-typing")
            ? { ...msg, id: String(Date.now()), content: (reply?.content?.trim?.() ? reply.content : T.fallback) }
            : msg
        )
      );
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      setMessages((m) => m.map((msg: any) => (msg.id.endsWith("-typing") ? { ...msg, id: Date.now() + "-err", content: T.aiBusy } : msg)));
    } finally {
      setSending(false);
    }
  }

  const bottomPad = Math.max(insets.bottom, 8) + 56; // room for tab bar

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 0}
        >
          {/* Header card */}
          <View style={styles.headerWrap}>
            <View style={styles.headerCard}>
              <View style={styles.headerAccentDot} />
              <Text style={styles.title}>{T.title}</Text>
              <Text style={styles.subtitle}>{T.subtitle}</Text>
            </View>
          </View>

          {/* Chat list */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
                <ChatBubble role={item.role === "user" ? "user" : "assistant"} text={item.content} />
              </View>
            )}
            contentContainerStyle={{ paddingBottom: bottomPad, backgroundColor: UI.bg, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCard}>
                  <Ionicons name="chatbubbles-outline" size={22} color={UI.subtext} />
                  <Text style={styles.emptyTitle}>Start a conversation</Text>
                  <Text style={styles.emptyHint}>Tell me your grade and topic. I’ll guide you.</Text>
                </View>
              </View>
            }
          />

          {/* Bottom input card */}
          <View style={[styles.inputOuter, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]}>
            <View style={styles.inputCard}>
              <TextInput
                style={[styles.input, rtl]}
                placeholder={T.placeholder}
                placeholderTextColor={UI.subtext}
                value={input}
                onChangeText={setInput}
                multiline
              />
              <Pressable
                onPress={onSend}
                disabled={sending || !input.trim()}
                style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.45 }]}
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    shadowColor: UI.accent,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerAccentDot: { width: 10, height: 10, borderRadius: 10, backgroundColor: UI.accent, opacity: 0.95, marginBottom: 10 },
  title: { color: UI.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: UI.subtext, marginTop: 3, fontSize: 13 },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { color: UI.text, fontWeight: "700" },
  emptyHint: { color: UI.subtext, fontSize: 12 },

  inputOuter: { paddingHorizontal: 10, backgroundColor: UI.bg },
  inputCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 8,
    backgroundColor: UI.cardElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.cardBorder,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: UI.inputBg,
    color: UI.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.inputBorder,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: UI.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: UI.accentOutline,
  },
});