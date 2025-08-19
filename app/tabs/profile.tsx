import { View, Text, StyleSheet, Button, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../lib/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadJSON, ONBOARD_KEY, OnboardingData } from "../../lib/storage";
import { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState<OnboardingData | null>(null);
  useEffect(() => { (async () => setUser(await loadJSON(ONBOARD_KEY, null)))(); }, []);

  async function reset() {
    await AsyncStorage.clear();
    Alert.alert("Reset", "All local data cleared. Restart the app to see onboarding again.");
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 12 }}>Profile</Text>

      <LinearGradient colors={[Colors.purple, Colors.purpleDark]} style={styles.hero}>
        <View style={styles.avatar}><Text style={{ color: "white", fontWeight: "800" }}>{(user?.name?.[0] ?? "D").toUpperCase()}</Text></View>
        <View>
          <Text style={{ color: "white", fontWeight: "800", fontSize: 18 }}>{user?.name ?? "Daniel"}</Text>
          <Text style={{ color: "white" }}>{user?.grade ?? "Grade 3"} • {user?.language ?? "English"}</Text>
        </View>
      </LinearGradient>

      <View style={styles.grid}>
        <Tile title="Lessons" value="0" />
        <Tile title="Quizzes" value="0" />
        <Tile title="Perfect" value="0" />
        <Tile title="Badges" value="0" />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title="Clear Local Data" onPress={reset} />
      </View>
    </View>
  );
}

function Tile({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={{ fontSize: 18, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: Colors.subtext }}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 999, backgroundColor: "#00000022", alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", backgroundColor: "white", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: "flex-start" },
});