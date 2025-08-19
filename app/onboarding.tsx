import { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Button } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Chip from "../components/Chip";
import { Colors } from "../lib/colors";
import { saveJSON, ONBOARD_KEY, OnboardingData } from "../lib/storage";
import { router } from "expo-router";

const LANGS = ["English", "नेपाली", "اردو", "বাংলা", "हिन्दी"];
const GRADES = ["Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11"];

export default function Onboarding() {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("English");
  const [grade, setGrade] = useState("Grade 3");

  async function continueNext() {
    const data: OnboardingData = { name: name.trim() || "Learner", language, grade };
    await saveJSON(ONBOARD_KEY, data);
    router.replace("/tabs/home");
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <LinearGradient colors={[Colors.purple, Colors.purpleDark]} style={styles.hero}>
        <Text style={styles.h1}>Welcome to Off Klass!</Text>
        <Text style={styles.p}>Let's get you started on your learning journey</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.label}>What's your name?</Text>
        <TextInput
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Choose your language</Text>
        <View style={styles.rowWrap}>
          {LANGS.map(l => (
            <Chip key={l} label={l} active={l === language} onPress={() => setLanguage(l)} style={{ marginRight: 8, marginBottom: 8 }} />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>What grade are you in?</Text>
        <View style={styles.rowWrap}>
          {GRADES.map(g => (
            <Chip key={g} label={g} active={g === grade} onPress={() => setGrade(g)} style={{ marginRight: 8, marginBottom: 8 }} />
          ))}
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <Button title="Continue" onPress={continueNext} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 18, marginBottom: 16 },
  h1: { color: "white", fontSize: 24, fontWeight: "800" },
  p: { color: "white", opacity: 0.9, marginTop: 6, fontWeight: "500" },

  card: { backgroundColor: Colors.card, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  label: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 16, color: Colors.text, backgroundColor: "#F8FAFC" },

  rowWrap: { flexDirection: "row", flexWrap: "wrap" },
});