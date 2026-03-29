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
import { callAI, prepareAI, type Message } from "../../lib/ai.local";
import {
  loadJSON,
  saveJSON,
  ONBOARD_KEY,
  type OnboardingData,
} from "../../lib/storage";

/* --------------------------- Theme --------------------------- */

const UI = {
  bg: "#F0F7FF",
  card: "rgba(255,255,255,0.96)",
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
    tipTitle: string;
    tipSub: string;
    startTitle: string;
    startHint: string;
    localMode: string;
    sending: string;
    analyzing: string;
    generating: string;
  }
> = {
  English: {
    title: "Offklass Buddy",
    subtitle: "Let’s learn together!",
    placeholder:
      "Ask about place value, addition, subtraction, multiplication, or division...",
    greeting:
      "Hi there! 👋 I’m your Offklass Buddy. Ask me about your lesson and I’ll answer from the local lesson library.",
    aiBusy: "Something went wrong. Please try again!",
    fallback:
      "I couldn’t find that in my lesson library yet. Try another math question.",
    tipTitle: "Learning Boosters",
    tipSub: "Tap one to add it to your message.",
    startTitle: "Ready to Start?",
    startHint: "Ask about a unit, topic, flashcard, or quiz question.",
    localMode: "Instant lesson library",
    sending: "Sending...",
    analyzing: "Analyzing the question... 🤔",
    generating: "Finding the best answer... ✍️",
  },
  नेपाली: {
    title: "Offklass साथी",
    subtitle: "सँगै सिकौं!",
    placeholder:
      "place value, addition, subtraction, multiplication, division बारे सोध्नुहोस्...",
    greeting:
      "नमस्ते! म तपाईंको Offklass साथी हुँ। पाठको बारेमा सोध्नुहोस्, म लोकल lesson library बाट उत्तर दिनेछु।",
    aiBusy: "केही समस्या भयो। फेरि प्रयास गर्नुहोस्!",
    fallback:
      "यो उत्तर मेरो lesson library मा भेटिएन। अर्को math question सोध्नुहोस्।",
    tipTitle: "Learning Boosters",
    tipSub: "ट्याप गर्दा सन्देशमा थपिन्छ।",
    startTitle: "सुरु गर्न तयार?",
    startHint: "युनिट, विषय, फ्ल्यासकार्ड, वा क्विज प्रश्न सोध्नुहोस्।",
    localMode: "तुरुन्त lesson library",
    sending: "पठाउँदै...",
    analyzing: "प्रश्न हेरिँदैछ... 🤔",
    generating: "सबैभन्दा राम्रो उत्तर खोजिँदैछ... ✍️",
  },
  اردو: {
    title: "Offklass ساتھی",
    subtitle: "آؤ مل کر سیکھیں!",
    placeholder:
      "place value, addition, subtraction, multiplication, division کے بارے میں پوچھیں...",
    greeting:
      "سلام! میں آپ کا Offklass ساتھی ہوں۔ سبق کے بارے میں پوچھیں، میں لوکل lesson library سے جواب دوں گا۔",
    aiBusy: "کچھ مسئلہ ہو گیا۔ دوبارہ کوشش کریں!",
    fallback:
      "یہ جواب میری lesson library میں نہیں ملا۔ ایک اور math question پوچھیں۔",
    tipTitle: "Learning Boosters",
    tipSub: "ٹیپ کریں، پیغام میں شامل ہو جائے گا۔",
    startTitle: "شروع کرنے کے لیے تیار؟",
    startHint: "یونٹ، ٹاپک، فلیش کارڈ یا کوئز سوال پوچھیں۔",
    localMode: "فوری lesson library",
    sending: "بھیجا جا رہا ہے...",
    analyzing: "سوال دیکھا جا رہا ہے... 🤔",
    generating: "بہترین جواب تلاش کیا جا رہا ہے... ✍️",
  },
  বাংলা: {
    title: "Offklass বন্ধু",
    subtitle: "চলো একসাথে শিখি!",
    placeholder:
      "place value, addition, subtraction, multiplication, division নিয়ে জিজ্ঞেস করো...",
    greeting:
      "হাই! আমি তোমার Offklass বন্ধু। লেসনের বিষয়ে জিজ্ঞেস করো, আমি লোকাল lesson library থেকে উত্তর দেব।",
    aiBusy: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করো!",
    fallback:
      "এটা আমার lesson library-তে পাওয়া যায়নি। আরেকটা math question জিজ্ঞেস করো।",
    tipTitle: "Learning Boosters",
    tipSub: "ট্যাপ করলে মেসেজে যোগ হবে।",
    startTitle: "শুরু করতে প্রস্তুত?",
    startHint: "ইউনিট, টপিক, ফ্ল্যাশকার্ড বা কুইজ প্রশ্ন জিজ্ঞেস করো।",
    localMode: "ইনস্ট্যান্ট lesson library",
    sending: "পাঠানো হচ্ছে...",
    analyzing: "প্রশ্ন দেখা হচ্ছে... 🤔",
    generating: "সেরা উত্তর খোঁজা হচ্ছে... ✍️",
  },
  हिन्दी: {
    title: "Offklass Buddy",
    subtitle: "चलो साथ पढ़ते हैं!",
    placeholder:
      "place value, addition, subtraction, multiplication, division के बारे में पूछो...",
    greeting:
      "हाय! मैं तुम्हारा Offklass Buddy हूँ। lesson के बारे में पूछो, मैं local lesson library से answer दूँगा।",
    aiBusy: "कुछ गड़बड़ हो गई। फिर से try करो!",
    fallback:
      "यह answer मेरी lesson library में नहीं मिला। दूसरा math question पूछो।",
    tipTitle: "Learning Boosters",
    tipSub: "Tap करो, message में add हो जाएगा।",
    startTitle: "Start करने के लिए ready?",
    startHint: "Unit, topic, flashcard या quiz question पूछो।",
    localMode: "Instant lesson library",
    sending: "Sending...",
    analyzing: "Question देखा जा रहा है... 🤔",
    generating: "Best answer ढूँढा जा रहा है... ✍️",
  },
};

const STORE_KEY = "chat:offklass";

/* -------------------------- Decorative Background -------------------------- */

const KidBackground = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View
      style={[
        styles.blob,
        {
          top: -50,
          right: -50,
          backgroundColor: "#DBEAFE",
          width: 220,
          height: 220,
        },
      ]}
    />
    <View
      style={[
        styles.blob,
        {
          bottom: 110,
          left: -70,
          backgroundColor: "#EDE9FE",
          width: 170,
          height: 170,
        },
      ]}
    />
    <View
      style={[
        styles.blob,
        {
          top: "42%",
          right: -35,
          backgroundColor: "#FEF3C7",
          width: 90,
          height: 90,
        },
      ]}
    />
  </View>
);

/* -------------------------- Error Boundary -------------------------- */

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

/* -------------------------- Tip content -------------------------- */

type TipItem = { key: string; title: string; text: string; icon: any };

function getTips(): TipItem[] {
  return [
    {
      key: "steps",
      title: "Step-by-Step",
      text: "Explain this step by step using simple words.",
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
      title: "Check It",
      text: "Show a quick way to check the answer.",
      icon: "checkmark-circle",
    },
    {
      key: "quizme",
      title: "Challenge Me",
      text: "Give me a 3-question mini quiz on this topic.",
      icon: "trophy",
    },
    {
      key: "simpler",
      title: "Simpler!",
      text: "Explain it in a very simple way.",
      icon: "happy",
    },
  ];
}

export default function OffklassAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const [lang, setLang] = useState<Lang>("English");
  const T = useMemo(() => L10N[lang] ?? L10N.English, [lang]);

  const isRTL = lang === "اردو";
  const rtl = isRTL
    ? ({
        writingDirection: "rtl" as const,
        textAlign: "right" as const,
      } as const)
    : undefined;

  const router = useRouter();
  const params = useLocalSearchParams<{
    from?: string;
    question?: string;
    userAnswer?: string;
    correctAnswer?: string;
    topic?: string;
  }>();
  const lastQuestionRef = useRef<string | undefined>(undefined);

  const [composerH, setComposerH] = useState(80);

  const [tipOpen, setTipOpen] = useState(false);
  const tipFade = useRef(new Animated.Value(0)).current;
  const tipScale = useRef(new Animated.Value(0.9)).current;

  const tips = useMemo(() => getTips(), []);

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
    Animated.timing(tipFade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setTipOpen(false));
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

  const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";
  const keyboardOffset = Platform.OS === "ios" ? 0 : Math.max(0, insets.top);

  function onFocusInput() {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        await prepareAI();
      } catch {}

      const ob = await loadJSON<OnboardingData | null>(ONBOARD_KEY, null);
      const savedLang = (ob?.language as Lang) || "English";

      setLang(
        (LANGS as readonly string[]).includes(savedLang) ? savedLang : "English"
      );

      const greet: Message = {
        id: "greet1",
        role: "assistant",
        content: (L10N[savedLang] ?? L10N.English).greeting,
      };

      const saved = await loadJSON<unknown>(STORE_KEY, [greet]);
      const arr = Array.isArray(saved) ? (saved as any[]) : [greet];

      const normalizedMessages = arr
        .map((m) => ({
          id: String(m?.id ?? Date.now()),
          role:
            m?.role === "user" || m?.role === "assistant"
              ? m.role
              : "assistant",
          content:
            typeof m?.content === "string"
              ? m.content
              : JSON.stringify(m?.content ?? ""),
        }))
        .slice(-120) as Message[];

      setMessages(normalizedMessages.length ? normalizedMessages : [greet]);
      setIsBooting(false);

      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
    })();
  }, []);

  useEffect(() => {
    if (!isBooting) {
      saveJSON(STORE_KEY, messages);
    }
  }, [messages, isBooting]);

  useEffect(() => {
    if (
      !params.question ||
      lastQuestionRef.current === params.question ||
      input.trim().length > 0
    ) {
      return;
    }

    lastQuestionRef.current = params.question as string;

    const lines = [
      `I'm working on ${
        params.from === "flashcard" ? "this flashcard" : "this quiz question"
      } and need help:`,
      "",
      `Question: ${params.question}`,
      `My answer: ${params.userAnswer || "(I'm not sure)"}`,
      params.correctAnswer ? `Correct answer: ${params.correctAnswer}` : "",
      params.topic ? `Topic: ${params.topic}` : "",
      "",
      "Please explain step by step in a simple way for my grade level.",
    ];

    setInput(lines.filter(Boolean).join("\n"));

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
      inputRef.current?.focus();
    }, 160);
  }, [
    params.question,
    params.from,
    params.userAnswer,
    params.correctAnswer,
    params.topic,
    input,
  ]);

  function replaceTypingBubbleWith(text: string, typingId?: string) {
    setMessages((current) =>
      current.map((msg) =>
        typingId
          ? msg.id === typingId
            ? { ...msg, id: String(Date.now()), content: text }
            : msg
          : msg.id.endsWith("-typing")
          ? { ...msg, id: String(Date.now()), content: text }
          : msg
      )
    );
  }

  async function onSend() {
    const text = input.trim();
    if (!text || sending || isBooting) return;

    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    const typingId = `${Date.now()}-typing`;

    setMessages((m) => [
      ...m,
      userMsg,
      {
        id: typingId,
        role: "assistant",
        content: T.analyzing,
      },
    ]);

    setSending(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);

    const stageTimer = setTimeout(() => {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === typingId ? { ...msg, content: T.generating } : msg
        )
      );
    }, 700);

    try {
      const contextMessages = [...messagesRef.current.slice(-4), userMsg];
      const reply = await callAI(contextMessages);

      clearTimeout(stageTimer);

      const content =
        typeof reply?.content === "string" && reply.content.trim().length
          ? reply.content.trim()
          : T.fallback;

      replaceTypingBubbleWith(content, typingId);
    } catch {
      clearTimeout(stageTimer);
      replaceTypingBubbleWith(T.aiBusy, typingId);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: UI.bg }}
        edges={["top", "left", "right"]}
      >
        <KidBackground />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={keyboardBehavior as any}
          keyboardVerticalOffset={keyboardOffset}
        >
          <View style={styles.headerWrap}>
            <View style={styles.headerCard}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backBtn}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={22} color={UI.text} />
              </Pressable>

              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.title, rtl]}>{T.title}</Text>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: UI.green }]} />
                  <Text style={[styles.subtitle, rtl]}>
                    {isBooting ? T.sending : T.localMode}
                  </Text>
                </View>
              </View>

              <Pressable onPress={openTips} style={styles.tipPill} hitSlop={10}>
                <Ionicons name="sparkles" size={16} color={UI.purple} />
              </Pressable>
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
                <ChatBubble
                  role={item.role === "user" ? "user" : "assistant"}
                  text={item.content}
                />
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
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />

          <View
            style={[
              styles.composerOuter,
              { paddingBottom: Math.max(12, insets.bottom) },
            ]}
            onLayout={(e) =>
              setComposerH(Math.max(76, Math.ceil(e.nativeEvent.layout.height)))
            }
          >
            <View style={styles.composerCard}>
              <TextInput
                ref={inputRef}
                style={[styles.input, rtl]}
                placeholder={isBooting ? "Loading..." : T.placeholder}
                placeholderTextColor={UI.muted}
                value={input}
                onChangeText={setInput}
                onFocus={onFocusInput}
                multiline
                returnKeyType="send"
                blurOnSubmit={false}
                editable={!isBooting}
                onSubmitEditing={() => {
                  if (input.trim().length) onSend();
                }}
              />

              <Pressable
                onPress={() => {
                  inputRef.current?.focus();
                  onSend();
                }}
                disabled={sending || !input.trim() || isBooting}
                style={[
                  styles.sendBtn,
                  (sending || !input.trim() || isBooting) && { opacity: 0.5 },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="paw" size={20} color="#fff" />
                )}
              </Pressable>
            </View>
          </View>

          <Modal
            visible={tipOpen}
            transparent
            animationType="fade"
            onRequestClose={closeTips}
          >
            <Pressable style={styles.tipBackdrop} onPress={closeTips}>
              <Animated.View
                style={[
                  styles.tipModal,
                  { opacity: tipFade, transform: [{ scale: tipScale }] },
                ]}
              >
                <Text style={styles.tipTitle}>{T.tipTitle}</Text>
                <Text style={styles.tipSub}>{T.tipSub}</Text>

                <View style={{ gap: 8, marginTop: 12 }}>
                  {tips.map((t) => (
                    <Pressable
                      key={t.key}
                      onPress={() => applyTip(t.text)}
                      style={styles.tipRow}
                    >
                      <Ionicons name={t.icon} size={20} color={UI.purple} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tipRowTitle}>{t.title}</Text>
                        <Text style={styles.tipRowText} numberOfLines={2}>
                          {t.text}
                        </Text>
                      </View>
                      <Ionicons
                        name="add-circle"
                        size={22}
                        color={UI.green}
                      />
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: UI.green,
  },
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

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 90,
    paddingHorizontal: 16,
  },
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: UI.text,
    marginTop: 10,
  },
  emptyHint: {
    fontSize: 14,
    color: UI.subtext,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    fontWeight: "700",
  },

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

  tipBackdrop: {
    flex: 1,
    backgroundColor: "rgba(30,41,59,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  tipModal: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 22,
    elevation: 20,
  },
  tipTitle: { fontSize: 18, fontWeight: "900", color: UI.text },
  tipSub: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.subtext,
    marginTop: 4,
  },

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
  tipRowText: {
    fontSize: 12,
    fontWeight: "700",
    color: UI.subtext,
    marginTop: 2,
    lineHeight: 16,
  },
});