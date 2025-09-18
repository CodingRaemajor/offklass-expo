import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@/lib/colors";
import React from "react";
type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};
export default function Chip({ label, active, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? Colors.purple : "#F1F5F9", borderColor: active ? Colors.purple : Colors.border },
        style,
      ]}
    >
      <Text style={{ color: active ? "white" : Colors.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
});