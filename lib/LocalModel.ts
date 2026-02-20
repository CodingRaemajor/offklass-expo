// lib/LocalModel.ts
// Option 2: Reliable large-model download with resume + retries + stall watchdog
// Works in release builds too.
// Model stored in FileSystem.documentDirectory (NOT in APK, NOT in git)

import * as FileSystem from "expo-file-system";
import { loadJSON, saveJSON } from "./storage";

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                    */
/* -------------------------------------------------------------------------- */

export type ModelChoice = "gemma2b";

// Must match the GGUF file name EXACTLY
const FILENAME = "gemma-2-2b-it-Q4_K_M.gguf";

// Your public GGUF URL (bartowski repo)
const URL =
  "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf";

// size validation (adjust if your file differs)
const EXPECTED_MIN_SIZE = 1_600_000_000; // 1.6 GB
const EXPECTED_MAX_SIZE = 3_600_000_000; // 3.6 GB

// Safety: require free space (model + temp + headroom)
const REQUIRED_FREE_BYTES = 5_000_000_000; // 5GB recommended

// Resume metadata key
const RESUME_KEY = "offklass:model_resume_v1";

// Retry behavior
const MAX_RETRIES_DEFAULT = 4;

// Stall watchdog: if totalBytesWritten doesn't change for X ms, restart
const STALL_MS = 25_000;

// Progress callback type
export type ModelProgress = {
  phase: "checking" | "downloading" | "validating" | "ready" | "error";
  percent?: number; // 0-100
  writtenBytes?: number;
  totalBytes?: number;
  message?: string;
};

let cachedModelUri: string | null = null;

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function toFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

function paths() {
  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  const tmp = `${dir}${FILENAME}.part`;
  return { dir, dest, tmp };
}

async function existsAndSize(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  return { exists: info.exists, size: (info as any).size ?? 0 };
}

function validSize(size: number) {
  return size >= EXPECTED_MIN_SIZE && size <= EXPECTED_MAX_SIZE;
}

async function ensureDiskSpace(onProgress?: (p: ModelProgress) => void) {
  onProgress?.({ phase: "checking", message: "Checking storage..." });

  // Some devices may throw; handle gracefully.
  try {
    const free = await FileSystem.getFreeDiskStorageAsync();
    if (free < REQUIRED_FREE_BYTES) {
      throw new Error(
        `Not enough free storage. Need ~${Math.round(REQUIRED_FREE_BYTES / 1e9)}GB free. ` +
          `You have ~${Math.round(free / 1e9)}GB free.`
      );
    }
  } catch (e) {
    // If API unavailable, we don't block — but warn in logs.
    console.warn("[Model] Free disk storage check failed/unsupported:", e);
  }
}

async function clearResumeMeta() {
  await saveJSON(RESUME_KEY, null as any);
}

async function readResumeMeta(): Promise<any | null> {
  return await loadJSON<any | null>(RESUME_KEY, null);
}

async function writeResumeMeta(meta: any) {
  await saveJSON(RESUME_KEY, meta);
}

/* -------------------------------------------------------------------------- */
/*                           CORE DOWNLOAD (RESUME)                            */
/* -------------------------------------------------------------------------- */

async function downloadWithResume(opts: {
  onProgress?: (p: ModelProgress) => void;
  maxRetries?: number;
}) {
  const { onProgress, maxRetries = MAX_RETRIES_DEFAULT } = opts;
  const { dest, tmp } = paths();

  // If already valid, return immediately
  const destInfo = await FileSystem.getInfoAsync(dest);
  if (destInfo.exists) {
    const size = (destInfo as any).size ?? 0;
    if (validSize(size)) return toFileUri(dest);

    // invalid file -> delete
    console.log("[Model] Existing model invalid size, deleting:", size);
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  await ensureDiskSpace(onProgress);

  // If tmp exists but resume meta missing, delete tmp (avoid corrupt states)
  const tmpInfo = await FileSystem.getInfoAsync(tmp);
  const resumeMeta = await readResumeMeta();
  if (tmpInfo.exists && !resumeMeta?.resumeData) {
    console.log("[Model] Found partial file without resume meta, deleting tmp.");
    await FileSystem.deleteAsync(tmp, { idempotent: true });
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;

    try {
      onProgress?.({
        phase: "downloading",
        percent: 0,
        message: attempt === 1 ? "Downloading model..." : `Retrying download... (attempt ${attempt})`,
      });

      let lastWritten = 0;
      let lastChangeAt = Date.now();
      let watchdog: any = null;

      const metaNow = await readResumeMeta();
      const resumeData = metaNow?.resumeData ?? undefined;

      const dl = FileSystem.createDownloadResumable(
        URL,
        tmp,
        {},
        (progress) => {
          const total = progress.totalBytesExpectedToWrite || 1;
          const written = progress.totalBytesWritten || 0;
          const percent = Math.min(100, Math.max(0, (written / total) * 100));

          // stall watchdog tracking
          if (written !== lastWritten) {
            lastWritten = written;
            lastChangeAt = Date.now();
          }

          onProgress?.({
            phase: "downloading",
            percent,
            writtenBytes: written,
            totalBytes: total,
            message: `Downloading... ${percent.toFixed(1)}%`,
          });
        },
        resumeData
      );

      // Start stall watchdog
      watchdog = setInterval(async () => {
        if (Date.now() - lastChangeAt > STALL_MS) {
          console.warn("[Model] Download stalled. Pausing and retrying...");
          try {
            const paused = await dl.pauseAsync();
            await writeResumeMeta({ resumeData: paused.resumeData, updatedAt: Date.now() });
          } catch {}
          throw new Error("Download stalled (no progress).");
        }
      }, 2500);

      let result: FileSystem.FileSystemDownloadResult | undefined;

      // If we have resumeData and tmp exists, resume; else fresh download
      const tmpNow = await FileSystem.getInfoAsync(tmp);
      if (resumeData && tmpNow.exists) {
        result = await dl.resumeAsync();
      } else {
        result = await dl.downloadAsync();
      }

      // Clear watchdog
      if (watchdog) clearInterval(watchdog);

      if (!result?.uri) throw new Error("Download failed (no result uri).");

      // Move tmp -> dest
      onProgress?.({ phase: "validating", message: "Finalizing model..." });

      // Ensure tmp exists
      const tmpAfter = await FileSystem.getInfoAsync(tmp);
      if (!tmpAfter.exists) {
        // In some cases expo writes directly to tmp; if missing, use result.uri
        console.log("[Model] tmp missing, using result.uri:", result.uri);
      }

      // If result.uri is tmp already, just move it
      const fromPath = result.uri;
      await FileSystem.moveAsync({ from: fromPath, to: dest });

      // Validate size
      const final = await FileSystem.getInfoAsync(dest);
      const finalSize = (final as any).size ?? 0;

      if (!final.exists || !validSize(finalSize)) {
        throw new Error(`Downloaded model size invalid: ${finalSize}`);
      }

      await clearResumeMeta();

      onProgress?.({
        phase: "ready",
        percent: 100,
        message: `Model ready (${Math.round(finalSize / 1e6)} MB)`,
      });

      return toFileUri(dest);
    } catch (err: any) {
      console.error(`[Model] Download attempt ${attempt} failed:`, err?.message ?? err);

      // try to save resume data if possible
      try {
        // If tmp exists, keep it and resume later
        const meta = await readResumeMeta();
        if (!meta?.resumeData) {
          // nothing to resume — keep tmp anyway
        }
      } catch {}

      // last attempt => fail hard
      if (attempt > maxRetries) {
        onProgress?.({
          phase: "error",
          message: `Model download failed after ${maxRetries + 1} attempts.`,
        });
        throw err;
      }

      // backoff
      const waitMs = Math.min(8000, 1200 * attempt);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  throw new Error("Download failed.");
}

/* -------------------------------------------------------------------------- */
/*                              PUBLIC API                                    */
/* -------------------------------------------------------------------------- */

export async function ensureModel(opts?: {
  onProgress?: (p: ModelProgress) => void;
  maxRetries?: number;
}): Promise<string> {
  if (cachedModelUri) return cachedModelUri;

  const { dest } = paths();

  // quick check
  opts?.onProgress?.({ phase: "checking", message: "Checking existing model..." });
  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists) {
    const size = (info as any).size ?? 0;
    if (validSize(size)) {
      cachedModelUri = toFileUri(dest);
      opts?.onProgress?.({ phase: "ready", percent: 100, message: "Model already installed." });
      return cachedModelUri;
    }
    // invalid size => delete and re-download
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  cachedModelUri = await downloadWithResume({
    onProgress: opts?.onProgress,
    maxRetries: opts?.maxRetries,
  });

  return cachedModelUri;
}

export async function isModelDownloaded(): Promise<boolean> {
  const { dest } = paths();
  const info = await FileSystem.getInfoAsync(dest);
  if (!info.exists) return false;
  const size = (info as any).size ?? 0;
  return validSize(size);
}

export async function getModelInfo(): Promise<{ exists: boolean; size?: number; path?: string }> {
  const { dest } = paths();
  const info = await FileSystem.getInfoAsync(dest);
  return {
    exists: info.exists,
    size: info.exists ? ((info as any).size ?? 0) : undefined,
    path: info.exists ? dest : undefined,
  };
}

export async function deleteModel(): Promise<void> {
  const { dest, tmp } = paths();
  await FileSystem.deleteAsync(dest, { idempotent: true });
  await FileSystem.deleteAsync(tmp, { idempotent: true });
  await clearResumeMeta();
  cachedModelUri = null;
  console.log("[Model] Deleted model + temp + resume metadata");
}