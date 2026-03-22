// lib/LocalModel.ts
import * as FileSystem from "expo-file-system";

export type ModelChoice = "smollm2";

// Must match your GGUF filename exactly
const FILENAME = "smollm2-1.7b-instruct-q4_k_m.gguf";

const URL =
  "https://huggingface.co/bartowski/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf";

/**
 * SmolLM2 1.7B Q4_K_M is much smaller than Gemma 2B.
 * These size bounds are intentionally tolerant.
 */
const EXPECTED_MIN_SIZE = 700_000_000; // 700 MB
const EXPECTED_MAX_SIZE = 1_500_000_000; // 1.5 GB

let cachedModelPath: string | null = null;

function toFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

export type DownloadProgress = {
  percent: number;
  written: number;
  total: number;
};

async function ensureDownloaded(
  onProgress?: (p: DownloadProgress) => void
): Promise<string> {
  if (cachedModelPath) return cachedModelPath;

  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;

  const info = await FileSystem.getInfoAsync(dest);

  if (info.exists) {
    const size = info.size ?? 0;
    if (size >= EXPECTED_MIN_SIZE && size <= EXPECTED_MAX_SIZE) {
      cachedModelPath = toFileUri(dest);
      return cachedModelPath;
    } else {
      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
    }
  }

  const tmp = `${dest}.part`;
  await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => {});

  const dl = FileSystem.createDownloadResumable(URL, tmp, {}, (progress) => {
    const total = progress.totalBytesExpectedToWrite || 1;
    const written = progress.totalBytesWritten || 0;
    const percent = Math.max(0, Math.min(100, (written / total) * 100));

    onProgress?.({
      percent,
      written,
      total,
    });
  });

  const result = await dl.downloadAsync();
  if (!result) throw new Error("Download failed");

  await FileSystem.moveAsync({ from: tmp, to: dest });

  await new Promise((r) => setTimeout(r, 400));

  const finalInfo = await FileSystem.getInfoAsync(dest);
  const finalSize = finalInfo.exists ? (finalInfo.size ?? 0) : 0;

  if (finalSize < EXPECTED_MIN_SIZE || finalSize > EXPECTED_MAX_SIZE) {
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
    throw new Error(
      `Downloaded file size looks wrong: ${(finalSize / 1_000_000).toFixed(0)} MB`
    );
  }

  cachedModelPath = toFileUri(dest);
  return cachedModelPath;
}

/* ------------------------------ PUBLIC API ------------------------------ */

export async function ensureModel(
  onProgress?: (p: DownloadProgress) => void
): Promise<string> {
  return ensureDownloaded(onProgress);
}

export async function isModelDownloaded(choice?: ModelChoice): Promise<boolean> {
  if (choice && choice !== "smollm2") return false;
  if (cachedModelPath) return true;

  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  const info = await FileSystem.getInfoAsync(dest);

  if (!info.exists) return false;

  const size = info.size ?? 0;
  return size >= EXPECTED_MIN_SIZE && size <= EXPECTED_MAX_SIZE;
}

export async function deleteModel(choice?: ModelChoice): Promise<void> {
  if (choice && choice !== "smollm2") return;

  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
  cachedModelPath = null;
}

export async function getModelInfo(): Promise<{
  exists: boolean;
  size?: number;
  path?: string;
  filename?: string;
}> {
  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  const info = await FileSystem.getInfoAsync(dest);

  return {
    exists: info.exists,
    size: info.exists ? info.size : undefined,
    path: info.exists ? dest : undefined,
    filename: FILENAME,
  };
}