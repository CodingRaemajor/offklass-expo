import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../lib/colors";

export default function ChatBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <View style={[styles.wrap, { alignItems: isUser ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}
      >
        <Text style={{ color: isUser ? "white" : Colors.text }}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  bubble: {
    maxWidth: "86%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    borderWidth: 1
  },
  userBubble: {
    backgroundColor: Colors.purple, borderColor: Colors.purple
  },
  botBubble: {
    backgroundColor: "white", borderColor: Colors.border
  }
});