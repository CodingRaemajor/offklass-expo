import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../lib/colors";
import React from "react";

type Props = { title: string; value: string; };
export default function StatCard({ title, value }: Props) {
  return (
    <LinearGradient colors={[Colors.purple, Colors.purpleDark]} style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  card: { flex: 1, height: 86, borderRadius: 16, padding: 14, justifyContent: "center" },
  value: { color: "white", fontSize: 20, fontWeight: "700" },
  title: { color: "white", opacity: 0.9, marginTop: 4, fontWeight: "500" },
});