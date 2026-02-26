import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { Colors } from "../lib/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ✅ Bigger max width (was 78%)
const MAX_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 600);

function parseMessage(text: string) {
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
    <View
      style={[
        styles.wrap,
        { alignItems: isUser ? "flex-end" : "flex-start" },
      ]}
    >
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
              <ScrollView
                key={index}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.codeScroll}
              >
                <View style={styles.codeBlock}>
                  <Text style={styles.codeText} selectable>
                    {part.content}
                  </Text>
                </View>
              </ScrollView>
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
    marginBottom: 10, // space between bubbles
  },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexShrink: 1, // ✅ prevents clipping
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
    flexWrap: "wrap",
  },

  codeScroll: {
    marginTop: 8,
  },

  codeBlock: {
    padding: 12,
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
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