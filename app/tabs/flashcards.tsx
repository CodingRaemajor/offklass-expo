import { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Colors } from "../../lib/colors";
import { loadJSON, saveJSON } from "../../lib/storage";

type Card = { id: string; front: string; back: string };

export default function Flashcards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [front, setFront] = useState(""); const [back, setBack] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { (async () => {
    setCards(await loadJSON<Card[]>("cards", [
      { id: "1", front: "sin(π/2)", back: "1" },
      { id: "2", front: "∫ 1/x dx", back: "ln|x| + C" },
    ]));
  })(); }, []);

  async function add() {
    if (!front.trim() || !back.trim()) return;
    const next = [...cards, { id: Date.now().toString(), front, back }];
    setCards(next); setFront(""); setBack(""); await saveJSON("cards", next);
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 10 }}>Flashcards</Text>
      <View style={styles.row}>
        <TextInput style={styles.input} placeholder="Front" value={front} onChangeText={setFront} />
        <TextInput style={styles.input} placeholder="Back" value={back} onChangeText={setBack} />
        <Button title="Add" onPress={add} />
      </View>
      <FlatList
        data={cards}
        keyExtractor={i => i.id}
        contentContainerStyle={{ gap: 8, marginTop: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setOpen(open === item.id ? null : item.id)} style={styles.card}>
            <Text style={{ fontWeight: "700" }}>{item.front}</Text>
            {open === item.id && <Text style={{ marginTop: 6, color: Colors.subtext }}>{item.back}</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10, backgroundColor: "#F8FAFC" },
  card: { backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
});