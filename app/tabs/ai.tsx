// app/(tabs)/ai.tsx
import React, { useEffect, useRef, useState } from "react";
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
import { loadJSON, saveJSON } from "../../lib/storage";

// ---- Error Boundary ----
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

const STORE_KEY = "chat:offklass";

export default function OffklassAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Load history
  useEffect(() => {
    (async () => {
      const defaults: Message[] = [
        { id: "greet1", role: "assistant", content: "Hi! I’m Offklass AI. Tell me your grade and what you’d like to learn today 🤗" },
      ];
      const saved = await loadJSON<unknown>(STORE_KEY, defaults);
      const arr = Array.isArray(saved) ? (saved as any[]) : defaults;
      const clean: Message[] = arr.map((m) => ({
        id: String(m?.id ?? Date.now()),
        role: m?.role === "user" || m?.role === "assistant" ? m.role : "assistant",
        content: typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? ""),
      })).slice(-100);
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
                content: reply?.content ?? "I couldn’t think of an answer 😅",
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
            ? { ...msg, id: Date.now() + "-err", content: "⚠️ AI is busy. Try again!" }
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
          <Text style={styles.title}>Offklass AI</Text>
          <Text style={styles.subtitle}>Ask questions. Get friendly help.</Text>
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