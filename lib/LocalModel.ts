// lib/LocalModel.ts
import * as FileSystem from "expo-file-system";

export type ModelChoice = "gemma2b";

// ⚠️ Must match your GGUF filename exactly
const FILENAME = "google_gemma-2-2b-it-Q4_K_M.gguf";

const URL =
  "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf";

/**
 * ✅ IMPORTANT:
 * Your previous EXPECTED_MIN_SIZE (1.6GB) is often wrong for this file.
 * That causes: download → size check fails → delete → download again → AI Error.
 *
 * These bounds are intentionally tolerant.
 */
const EXPECTED_MIN_SIZE = 900_000_000; // 0.9 GB
const EXPECTED_MAX_SIZE = 3_200_000_000; // 3.2 GB

let cachedModelPath: string | null = null;

function toFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

export type DownloadProgress = {
  percent: number; // 0-100
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
      // invalid / partial / wrong file
      await FileSystem.deleteAsync(dest, { idempotent: true });
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

  // Move into final filename only after it finishes
  await FileSystem.moveAsync({ from: tmp, to: dest });

  // Small delay helps Android file system settle before initLlama reads it
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

export async function isModelDownloaded(): Promise<boolean> {
  if (cachedModelPath) return true;

  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  const info = await FileSystem.getInfoAsync(dest);

  if (!info.exists) return false;

  const size = info.size ?? 0;
  return size >= EXPECTED_MIN_SIZE && size <= EXPECTED_MAX_SIZE;
}

export async function deleteModel(): Promise<void> {
  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  await FileSystem.deleteAsync(dest, { idempotent: true });
  cachedModelPath = null;
}

export async function getModelInfo(): Promise<{
  exists: boolean;
  size?: number;
  path?: string;
}> {
  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  const info = await FileSystem.getInfoAsync(dest);

  return {
    exists: info.exists,
    size: info.exists ? info.size : undefined,
    path: info.exists ? dest : undefined,
  };
}