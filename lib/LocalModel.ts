// lib/localModel.ts
import * as FileSystem from "expo-file-system";

const DIR = FileSystem.documentDirectory + "models/";
const FILE_3B = "llama-3.2-3b-instruct-Q4_K_M.gguf";
const FILE_1B = "llama-3.2-1b-instruct-Q4_K_M.gguf";

// Good 3B Q4 (≈2.0–2.1 GB)
const URL_3B =
  "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true";

// Lightweight 1B Q4 (≈0.8–1.0 GB)
const URL_1B =
  "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf?download=true";

export type ModelChoice = "3b" | "1b";

export async function ensureModel(choice: ModelChoice = "1b"): Promise<string> {
  const file = choice === "3b" ? FILE_3B : FILE_1B;
  const url = choice === "3b" ? URL_3B : URL_1B;
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  const target = DIR + file;

  const info = await FileSystem.getInfoAsync(target);
  if (!info.exists) {
    // NOTE: big download – show a progress UI in production
    const { uri } = await FileSystem.downloadAsync(url, target);
    return "file://" + uri.replace("file://", "");
  }
  return "file://" + target.replace("file://", "");
}