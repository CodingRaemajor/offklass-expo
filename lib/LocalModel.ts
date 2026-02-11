// lib/LocalModel.ts
// Optimized model management with Gemma-3-1B-IT (Q4_K_M) from reliable source

import * as FileSystem from 'expo-file-system';

export type ModelChoice = 'gemma1b';

const FILENAME = 'google_gemma-3-1b-it-Q4_K_M.gguf';
// Using Bartowski's repo which is known to work well
const URL = 'https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF/resolve/main/google_gemma-3-1b-it-Q4_K_M.gguf?download=true';

// Expected file size for validation (Q4_K_M is typically around 700MB-800MB)
const EXPECTED_MIN_SIZE = 600_000_000;  // 600 MB minimum
const EXPECTED_MAX_SIZE = 900_000_000;  // 900 MB maximum

// Cache the model path to avoid repeated file system checks
let cachedModelPath: string | null = null;

async function ensureDownloaded(): Promise<string> {
  // Return cached path if available
  if (cachedModelPath) {
    console.log('[Model] Using cached model path:', cachedModelPath);
    return cachedModelPath;
  }

  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  
  // Check if model already exists and is valid
  const info = await FileSystem.getInfoAsync(dest);
  
  if (info.exists) {
    const size = info.size ?? 0;
    
    // Validate file size is in expected range
    if (size >= EXPECTED_MIN_SIZE && size <= EXPECTED_MAX_SIZE) {
      console.log(`[Model] Gemma-3-1B model found and validated: ${(size / 1_000_000).toFixed(0)} MB`);
      cachedModelPath = dest.startsWith('file://') ? dest : `file://${dest}`;
      return cachedModelPath;
    } else {
      console.log(`[Model] Model file size invalid (${size} bytes), re-downloading...`);
      // Delete invalid file
      try {
        await FileSystem.deleteAsync(dest, { idempotent: true });
      } catch (err) {
        console.error('[Model] Failed to delete invalid model:', err);
      }
    }
  }

  // Download the model
  console.log('[Model] Downloading Gemma-3-1B-IT model from Bartowski repo...');
  const tmp = `${dest}.part`;
  
  try {
    // Clean up any partial downloads
    await FileSystem.deleteAsync(tmp, { idempotent: true });
  } catch {}

  try {
    const dl = FileSystem.createDownloadResumable(
      URL,
      tmp,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        const percent = (progress * 100).toFixed(1);
        console.log(`[Model] Download progress: ${percent}% (${(downloadProgress.totalBytesWritten / 1_000_000).toFixed(0)}MB)`);
      }
    );
    
    const result = await dl.downloadAsync();
    
    if (!result) {
      throw new Error('Download failed: no result returned');
    }
    
    console.log('[Model] Download complete, moving to final location...');
    await FileSystem.moveAsync({ from: tmp, to: dest });
    
    // Verify the downloaded file
    const finalInfo = await FileSystem.getInfoAsync(dest);
    const finalSize = finalInfo.exists ? finalInfo.size ?? 0 : 0;
    
    if (finalSize < EXPECTED_MIN_SIZE) {
      throw new Error(`Downloaded file too small: ${finalSize} bytes`);
    }
    
    console.log(`[Model] Gemma-3-1B model ready: ${(finalSize / 1_000_000).toFixed(0)} MB`);
    
  } catch (err) {
    console.error('[Model] Download error:', err);
    // Clean up failed download
    try {
      await FileSystem.deleteAsync(tmp, { idempotent: true });
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {}
    throw new Error('Gemma model download failed. Please check your internet connection and try again.');
  }

  cachedModelPath = dest.startsWith('file://') ? dest : `file://${dest}`;
  return cachedModelPath;
}

export async function ensureModel(_choice: ModelChoice = 'gemma1b'): Promise<string> {
  return ensureDownloaded();
}

// Helper function to check if model is already downloaded
export async function isModelDownloaded(): Promise<boolean> {
  if (cachedModelPath) return true;
  
  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  const info = await FileSystem.getInfoAsync(dest);
  
  if (info.exists) {
    const size = info.size ?? 0;
    return size >= EXPECTED_MIN_SIZE && size <= EXPECTED_MAX_SIZE;
  }
  
  return false;
}

// Helper function to get model info
export async function getModelInfo(): Promise<{ exists: boolean; size?: number; path?: string }> {
  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  const info = await FileSystem.getInfoAsync(dest);
  
  return {
    exists: info.exists,
    size: info.exists ? info.size : undefined,
    path: info.exists ? dest : undefined,
  };
}

// Helper function to delete model (for cleanup/reset)
export async function deleteModel(): Promise<void> {
  const dir = FileSystem.documentDirectory!;
  const dest = `${dir}${FILENAME}`;
  
  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
    cachedModelPath = null;
    console.log('[Model] Gemma model deleted successfully');
  } catch (err) {
    console.error('[Model] Failed to delete model:', err);
    throw err;
  }
}