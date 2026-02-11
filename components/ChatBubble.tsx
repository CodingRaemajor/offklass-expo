import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Colors } from "../lib/colors";

// Cap bubble width for tablets so text never stretches or cuts
const MAX_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 420);

export default function ChatBubble({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  const isUser = role === "user";

  return (
    <View style={[styles.wrap, { alignItems: isUser ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.botBubble,
          { maxWidth: MAX_WIDTH },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? "white" : Colors.text },
          ]}
          selectable
        >
          {text}
        </Text>
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
    lineHeight: 22,        // ⭐ prevents cramped math steps
    flexWrap: "wrap",     // ⭐ ensures no cut text
  },
});
