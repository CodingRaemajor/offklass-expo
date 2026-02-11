// components/SectionProgressHeader.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface SectionProgressHeaderProps {
  title: string;
  points: number;
  completed: number;
  total: number;
}

export function SectionProgressHeader({
  title,
  points,
  completed,
  total,
}: SectionProgressHeaderProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.points}>{points} pts</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      <Text style={styles.caption}>
        {completed}/{total} complete • {pct}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2933",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "700",
  },
  points: {
    color: "#A855F7",
    fontWeight: "700",
  },
  progressBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1F2933",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#7C3AED",
  },
  caption: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
  },
});