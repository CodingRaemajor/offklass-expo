// app/(tabs)/ai.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import ChatBubble from "../../components/ChatBubble";
import { callAI, type Message } from "../../lib/ai.local";
import { loadJSON, saveJSON } from "../../lib/storage";

// ---- Error Boundary to prevent native crash on render errors ----
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err?: any }> {
  constructor(props: any) { super(props); this.state = {}; }
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidCatch(err: any, info: any) { console.error("AI screen error:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <View style={{ flex: 1, padding: 16, backgroundColor: Colors.bg }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.text }}>Something went wrong</Text>
          <Text style={{ color: Colors.subtext, marginTop: 8 }}>
            {String(this.state.err?.message ?? this.state.err)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
// ----------------------------------------------------------------

const STORE_KEY = "chat:offklass";

export default function OffklassAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      // --- TEMP (run once, then remove): clears any corrupted saved chat
      // await AsyncStorage.removeItem("offklass:" + STORE_KEY);
      // ---

      const defaults: Message[] = [
        {
          id: "greet1",
          role: "assistant",
          content: "Hi! I’m Offklass AI. Tell me your grade and what you’d like to learn today 🤗",
        },
      ];
      const saved = await loadJSON<unknown>(STORE_KEY, defaults);
      const arr = Array.isArray(saved) ? (saved as any[]) : defaults;
      // sanitize to avoid invalid React children
      const clean: Message[] = arr
        .map((m) => {
          const role: Message["role"] =
            m?.role === "user" || m?.role === "assistant" ? m.role : "assistant";
          const content = typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? "");
          return { id: String(m?.id ?? Date.now()), role, content };
        })
        .slice(-100);
      setMessages(clean);
    })();
  }, []);

  // persist chat safely
  useEffect(() => {
    try { saveJSON(STORE_KEY, messages); } catch {}
  }, [messages]);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  // extra guard so render never crashes
  if (!Array.isArray(messages)) return null;

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);

    setSending(true);
    try {
      const base = Array.isArray(messages) ? messages : [];
      // call the REAL offline model API (imported from ../../lib/ai.local)
      const reply = await callAI([...base.slice(-10), userMsg]);
      // sanitize reply
      const safeReply: Message = {
        id: String(reply?.id ?? Date.now() + "-ai"),
        role: "assistant",
        content: typeof reply?.content === "string" ? reply.content : JSON.stringify(reply?.content ?? ""),
      };
      setMessages((m) => [...(Array.isArray(m) ? m : []), safeReply]);
    } catch (e) {
      console.warn("AI call failed:", e, (e as Error)?.message, (e as Error)?.stack);
      setMessages((m) => [
        ...(Array.isArray(m) ? m : []),
        { id: Date.now() + "-err", role: "assistant", content: "Sorry, I couldn’t reach the AI right now. Try again!" },
      ]);
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
        <View style={styles.header}>
          <Text style={styles.title}>Offklass AI</Text>
          <Text style={styles.subtitle}>Ask questions. Get friendly help.</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 12, gap: 10 }}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => (
            <ChatBubble
              key={m.id}
              role={m.role === "user" ? "user" : "assistant"}  // narrows away "system"
              text={m.content}
            />
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type your question…"
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