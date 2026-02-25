import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { Colors } from "../lib/colors";

const MAX_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 420);

function parseMessage(text: string) {
  // Split text by triple backticks ```
  const parts = text.split("```");

  return parts.map((part, index) => ({
    type: index % 2 === 1 ? "code" : "text",
    content: part.trim(),
  }));
}

export default function ChatBubble({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  const isUser = role === "user";
  const parts = parseMessage(text);

  return (
    <View style={[styles.wrap, { alignItems: isUser ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.botBubble,
          { maxWidth: MAX_WIDTH },
        ]}
      >
        {parts.map((part, index) => {
          if (part.type === "code") {
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
              style={[
                styles.text,
                { color: isUser ? "white" : Colors.text },
              ]}
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
  },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
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
    fontSize: 15,
    lineHeight: 22,
    flexWrap: "wrap",
  },

  codeBlock: {
    marginTop: 6,
    padding: 10,
    backgroundColor: "#F4F6FA",
    borderRadius: 8,
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