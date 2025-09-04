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
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import ChatBubble from "../../components/ChatBubble";
import { callAI, type Message } from "../../lib/ai.local";
import { loadJSON, saveJSON, ONBOARD_KEY, type OnboardingData } from "../../lib/storage";

/* ------------------------------- Error Boundary ------------------------------ */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err?: any }> {
  constructor(props: any) { super(props); this.state = {}; }
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidCatch(err: any, info: any) { console.error("AI screen error:", err, info); }
  render() {
    if ((this.state as any).err) {
      return (
        <View style={{ flex: 1, padding: 16, backgroundColor: Colors.bg }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.text }}>Something went wrong</Text>
          <Text style={{ color: Colors.subtext, marginTop: 8 }}>
            {String((this.state as any).err?.message ?? (this.state as any).err)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/* ---------------------------------- i18n ---------------------------------- */
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
  }
> = {
  English: {
    title: "Offklass AI",
    subtitle: "Ask questions. Get friendly help.",
    placeholder: "Type your question…",
    greeting: "Hi! I’m Offklass AI. Tell me your grade and what you’d like to learn today 🤗",
    aiBusy: "⚠️ AI is busy. Try again!",
    fallback: "I couldn’t think of an answer 😅",
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
    placeholder: "अपना प्रश्न लिखें…",
    greeting: "हाय! मैं Offklass AI हूँ। अपनी कक्षा और आज क्या सीखना चाहते हैं बताइए 🤗",
    aiBusy: "⚠️ एआई व्यस्त है। फिर से प्रयास करें!",
    fallback: "मैं उत्तर नहीं सोच पाया 😅",
  },
};

const STORE_KEY = "chat:offklass";

/* -------------------------------- Component -------------------------------- */
export default function OffklassAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // language
  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang], [lang]);
  const isRTL = lang === "اردو";
  const rtl = isRTL ? ({ writingDirection: "rtl" as "rtl", textAlign: "right" as const }) : undefined;

  // Load language first, then history (so greeting localizes)
  useEffect(() => {
    (async () => {
      const ob = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const savedLang = (ob?.language as Lang) || "English";
      const finalLang = LANGS.includes(savedLang) ? savedLang : "English";
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

  // Persist on change
  useEffect(() => { try { saveJSON(STORE_KEY, messages); } catch {} }, [messages]);

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };

    // Show user + typing bubble immediately
    setMessages((m) => [
      ...m,
      userMsg,
      { id: Date.now() + "-typing", role: "assistant", content: "…" },
    ]);

    setSending(true);
    try {
      // Use smaller context for speed
      const context = messages.slice(-3);
      const reply = await callAI([...context, userMsg]);

      setMessages((m) =>
        m.map((msg) =>
          msg.id.endsWith("-typing")
            ? {
                ...msg,
                id: String(Date.now()), // replace typing bubble
                content: typeof reply?.content === "string" && reply.content.trim()
                  ? reply.content
                  : T.fallback,
              }
            : msg
        )
      );

      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      console.warn("AI call failed:", e);
      setMessages((m) =>
        m.map((msg) =>
          msg.id.endsWith("-typing")
            ? { ...msg, id: Date.now() + "-err", content: T.aiBusy }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <ErrorBoundary>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, rtl]}>{T.title}</Text>
          <Text style={[styles.subtitle, rtl]}>{T.subtitle}</Text>
        </View>

        {/* Chat */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
              <ChatBubble role={item.role === "user" ? "user" : "assistant"} text={item.content} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          initialNumToRender={12}
          windowSize={10}
          removeClippedSubviews
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={[styles.input, rtl]}
            placeholder={T.placeholder}
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            onPress={onSend}
            disabled={sending || !input.trim()}
            style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.5 }]}
          >
            <Ionicons name="send" size={18} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.purple,
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 8,
  },
  title: { color: "white", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "white", opacity: 0.9, marginTop: 2 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
});