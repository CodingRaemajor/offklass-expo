import React from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  name: string;
  sublabel: string; // e.g. "Grade 4 Math • offklass"
  streak: number;
  level: number;
};

const BLUE = "#2F6BFF";

export default function DashboardHeader({ name, sublabel, streak, level }: Props) {
  const { width } = Dimensions.get("window");
  const isTablet = width >= 900;

  return (
    <View style={[styles.header, { paddingHorizontal: isTablet ? 28 : 16 }]}>
      <View style={styles.left}>
        <Pressable style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="layers-outline" size={isTablet ? 28 : 22} color="#fff" />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={[styles.title, { fontSize: isTablet ? 24 : 18 }]}>
            Welcome, {name}! <Text style={styles.wave}>👋</Text>
          </Text>
          <Text style={[styles.sub, { fontSize: isTablet ? 14 : 12 }]}>{sublabel}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Pill icon="flame-outline" text={`${streak}`} isTablet={isTablet} />
        <Pill icon="ribbon-outline" text={`Level ${level}`} isTablet={isTablet} />
      </View>
    </View>
  );
}

function Pill({
  icon,
  text,
  isTablet,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  isTablet: boolean;
}) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={isTablet ? 18 : 16} color="#fff" />
      <Text style={[styles.pillText, { fontSize: isTablet ? 14 : 12 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: BLUE,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { gap: 2, flexShrink: 1 },
  title: { color: "#fff", fontWeight: "900" },
  wave: { fontSize: 16 },
  sub: { color: "rgba(255,255,255,0.9)", fontWeight: "700" },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
  },
  pillText: { color: "#fff", fontWeight: "900" },
});
