// lib/LocalModel.ts
// Optimized model management for Gemma-3-3B-IT (Q4_K_M)
// Single-model setup (no switching)

import * as FileSystem from "expo-file-system";

export type ModelChoice = "gemma2b";

/* -------------------------------------------------------------------------- */
/*                            GEMMA 2B CONFIG                                 */
/* -------------------------------------------------------------------------- */

// ⚠️ Make sure filename matches EXACTLY your GGUF file
const FILENAME = "google_gemma-2-2b-it-Q4_K_M.gguf";

// ⚠️ Replace with the exact 2B GGUF URL you're using
const URL =
  "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf";

// 2B Q4_K_M is typically ~1GB–2GB
const EXPECTED_MIN_SIZE = 1_600_000_000; // 1.6 GB minimum
const EXPECTED_MAX_SIZE = 3_600_000_000; // 3.6 GB maximum

/* -------------------------------------------------------------------------- */
/*                                CACHE                                       */
/* -------------------------------------------------------------------------- */

let cachedModelPath: string | null = null;

function toFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

/* -------------------------------------------------------------------------- */
/*                             DOWNLOAD LOGIC                                 */
/* -------------------------------------------------------------------------- */

async function ensureDownloaded(): Promise<string> {
  if (cachedModelPath) {
    console.log("[Model] Using cached Gemma-2-2B path:", cachedModelPath);
    return cachedModelPath;
  }

  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;

  const info = await FileSystem.getInfoAsync(dest);

  if (info.exists) {
    const size = info.size ?? 0;

    if (size >= EXPECTED_MIN_SIZE && size <= EXPECTED_MAX_SIZE) {
      console.log(
        `[Model] Gemma-2-2B validated: ${(size / 1_000_000).toFixed(0)} MB`
      );
      cachedModelPath = toFileUri(dest);
      return cachedModelPath;
    } else {
      console.log("[Model] Invalid 2B file size. Re-downloading...");
      await FileSystem.deleteAsync(dest, { idempotent: true });
    }
  }

  console.log("[Model] Downloading Gemma-2-2B-IT model...");
  const tmp = `${dest}.part`;

  try {
    await FileSystem.deleteAsync(tmp, { idempotent: true });
  } catch {}

  try {
    const dl = FileSystem.createDownloadResumable(
      URL,
      tmp,
      {},
      (progress) => {
        const total = progress.totalBytesExpectedToWrite || 1;
        const percent = (
          (progress.totalBytesWritten / total) *
          100
        ).toFixed(1);

        console.log(
          `[Model] 2B Download: ${percent}% (${(
            progress.totalBytesWritten / 1_000_000
          ).toFixed(0)} MB)`
        );
      }
    );

    const result = await dl.downloadAsync();
    if (!result) throw new Error("Download failed");

    await FileSystem.moveAsync({ from: tmp, to: dest });

    const finalInfo = await FileSystem.getInfoAsync(dest);
    const finalSize = finalInfo.exists ? (finalInfo.size ?? 0) : 0;

    if (
      finalSize < EXPECTED_MIN_SIZE ||
      finalSize > EXPECTED_MAX_SIZE
    ) {
      throw new Error("Downloaded file size invalid");
    }

    console.log(
      `[Model] Gemma-2-2B ready: ${(finalSize / 1_000_000).toFixed(0)} MB`
    );
  } catch (err) {
    console.error("[Model] Download error:", err);

    try {
      await FileSystem.deleteAsync(tmp, { idempotent: true });
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {}

    throw new Error(
      "Gemma-2-2B download failed. Check internet and try again."
    );
  }

  cachedModelPath = toFileUri(dest);
  return cachedModelPath;
}

/* -------------------------------------------------------------------------- */
/*                              PUBLIC API                                    */
/* -------------------------------------------------------------------------- */

export async function ensureModel(): Promise<string> {
  return ensureDownloaded();
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

export async function deleteModel(): Promise<void> {
  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;

  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
    cachedModelPath = null;
    console.log("[Model] Gemma-2-2B deleted successfully");
  } catch (err) {
    console.error("[Model] Failed to delete model:", err);
    throw err;
  }
}
