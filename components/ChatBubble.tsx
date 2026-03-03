import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Colors } from "../lib/colors";

function parseMessage(text: string) {
  const parts = text.split("```");

  return parts
    .map((part, index) => {
      if (index % 2 === 1) {
        // Strip language identifier line (e.g. "python\n...")
        const newlineIndex = part.indexOf("\n");
        const content =
          newlineIndex !== -1 ? part.slice(newlineIndex + 1).trim() : part.trim();
        return { type: "code" as const, content };
      }
      return { type: "text" as const, content: part.trim() };
    })
    .filter((p) => p.content.length > 0);
}

export default function ChatBubble({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  const isUser = role === "user";
  const parts = useMemo(() => parseMessage(text), [text]);

  return (
    <View style={[styles.wrap, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {parts.map((part, index) => {
          if (part.type === "code") {
            // ✅ FINAL FIX: no horizontal ScrollView (it breaks layout on tablet after next render)
            return (
              <View key={index} style={styles.codeBlock}>
                <Text style={styles.codeText} selectable>
                  {part.content}
                </Text>
              </View>
            );
          }

          return (
            <Text
              key={index}
              style={[styles.text, { color: isUser ? "white" : Colors.text }]}
              selectable
            >
              {part.content}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginBottom: 10,
    flexDirection: "row", // ✅ makes justifyContent work properly
  },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexShrink: 1,
    maxWidth: 520, // ✅ stable on phone + tablet
  },

  userBubble: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
    borderTopRightRadius: 6,
  },

  botBubble: {
    backgroundColor: "white",
    borderColor: Colors.border,
    borderTopLeftRadius: 6,
  },

  text: {
    fontSize: 16,
    lineHeight: 24,
  },

  codeBlock: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
    maxWidth: "100%",
  },

  codeText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    color: "#111",
  },
});