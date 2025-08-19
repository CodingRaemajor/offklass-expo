import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Colors } from "../../lib/colors";
import { LinearGradient } from "expo-linear-gradient";
import StatCard from "../../components/StatCard";
import { loadJSON, ONBOARD_KEY, OnboardingData } from "../../lib/storage";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

export default function Home() {
  const [user, setUser] = useState<OnboardingData | null>(null);
  useEffect(() => { (async () => setUser(await loadJSON(ONBOARD_KEY, null)))(); }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <LinearGradient colors={[Colors.purple, Colors.purpleDark]} style={styles.welcome}>
        <View style={styles.avatar}><Text style={{ color: "white", fontWeight: "800" }}>{(user?.name?.[0] ?? "D").toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hello, {user?.name ?? "Daniel"}!</Text>
          <Text style={styles.meta}>{user?.grade ?? "Grade 3"} • {user?.language ?? "English"}</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatCard title="Level" value="1" />
        <StatCard title="Streak" value="0 days" />
        <StatCard title="Points" value="0" />
      </View>

      <Text style={styles.h2}>Quick Actions</Text>
      <View style={styles.actions}>
        <Action icon="play-circle-outline" label="Continue Learning" />
        <Action icon="help-circle-outline" label="Take Quiz" />
        <Action icon="albums-outline" label="Flashcards" />
        <Action icon="download-outline" label="Download Content" />
      </View>

      <Text style={styles.h2}>Recent Activity</Text>
      <View style={{ height: 80, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.subtext }}>No recent activity yet</Text>
      </View>
    </ScrollView>
  );
}

function Action({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <Pressable style={styles.action}>
      <Ionicons name={icon} size={24} color={Colors.purple} />
      <Text style={{ fontWeight: "600", marginTop: 6 }}>{label}</Text>
      <Text style={{ color: Colors.subtext, fontSize: 12, marginTop: 2 }}> </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  welcome: { borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 999, backgroundColor: "#00000022", alignItems: "center", justifyContent: "center" },
  hello: { color: "white", fontSize: 18, fontWeight: "800" },
  meta: { color: "white", opacity: 0.9, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  h2: { fontSize: 18, fontWeight: "700", marginBottom: 10, color: Colors.text },

  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  action: { width: "48%", backgroundColor: Colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
});