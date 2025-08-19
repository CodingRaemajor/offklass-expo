import { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { Colors } from "../../lib/colors";

const Q = [
  { q: "∫ 2x dx =", a: "x² + C", choices: ["x + C", "x² + C", "2x + C", "ln x + C"] },
  { q: "d/dx (sin x) =", a: "cos x", choices: ["-sin x", "cos x", "tan x", "sec x"] },
];

export default function Quizzes() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const done = i >= Q.length;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 10 }}>Quick Quiz</Text>
      {done ? (
        <>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>Score: {score}/{Q.length}</Text>
          <Button title="Restart" onPress={() => { setI(0); setScore(0); }} />
        </>
      ) : (
        <>
          <Text style={{ marginBottom: 12 }}>{Q[i].q}</Text>
          {Q[i].choices.map(c => (
            <View key={c} style={styles.choice}>
              <Button title={c} onPress={() => { if (c === Q[i].a) setScore(s => s + 1); setI(n => n + 1); }} />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({ choice: { marginBottom: 8 } });