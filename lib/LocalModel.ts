import * as FileSystem from "expo-file-system";

export type ModelChoice = "smollm2" | "qwen15b";

type ModelSpec = {
  filename: string;
  url: string;
  expectedMinSize: number;
  expectedMaxSize: number;
};

const MODEL_SPECS: Record<ModelChoice, ModelSpec> = {
  smollm2: {
    filename: "smollm2-1.7b-instruct-q4_k_m.gguf",
    url:
      "https://huggingface.co/bartowski/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf",
    expectedMinSize: 900_000_000,
    expectedMaxSize: 1_400_000_000,
  },
  qwen15b: {
    filename: "Qwen2.5-1.5B-Instruct-Q4_K_M.gguf",
    url:
      "https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf",
    expectedMinSize: 900_000_000,
    expectedMaxSize: 1_400_000_000,
  },
};

const cachedModelPaths: Partial<Record<ModelChoice, string>> = {};

function toFileUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

export type DownloadProgress = {
  percent: number;
  written: number;
  total: number;
};

async function getDestinationPath(choice: ModelChoice) {
  const dir = FileSystem.documentDirectory;
  if (!dir) {
    throw new Error("Document directory is unavailable on this device.");
  }

  return `${dir}${MODEL_SPECS[choice].filename}`;
}

async function validateExistingFile(
  path: string,
  choice: ModelChoice
): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return false;

  const size = info.size ?? 0;
  const spec = MODEL_SPECS[choice];
  return size >= spec.expectedMinSize && size <= spec.expectedMaxSize;
}

async function cleanupFile(path: string) {
  await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
}

async function ensureDownloaded(
  choice: ModelChoice,
  onProgress?: (p: DownloadProgress) => void
): Promise<string> {
  if (cachedModelPaths[choice]) return cachedModelPaths[choice]!;

  const spec = MODEL_SPECS[choice];
  const dest = await getDestinationPath(choice);

  const isValid = await validateExistingFile(dest, choice);
  if (isValid) {
    cachedModelPaths[choice] = toFileUri(dest);
    return cachedModelPaths[choice]!;
  }

  await cleanupFile(dest);

  const tmp = `${dest}.part`;
  await cleanupFile(tmp);

  const dl = FileSystem.createDownloadResumable(spec.url, tmp, {}, (progress) => {
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
  if (!result) {
    throw new Error(`${choice} model download failed.`);
  }

  await FileSystem.moveAsync({ from: tmp, to: dest });
  await new Promise((r) => setTimeout(r, 500));

  const finalInfo = await FileSystem.getInfoAsync(dest);
  const finalSize = finalInfo.exists ? (finalInfo.size ?? 0) : 0;

  if (finalSize < spec.expectedMinSize || finalSize > spec.expectedMaxSize) {
    await cleanupFile(dest);
    throw new Error(
      `Downloaded ${choice} file size looks wrong: ${(
        finalSize / 1_000_000_000
      ).toFixed(2)} GB`
    );
  }

  cachedModelPaths[choice] = toFileUri(dest);
  return cachedModelPaths[choice]!;
}

/* ------------------------------ PUBLIC API ------------------------------ */

export async function ensureModel(
  choice: ModelChoice,
  onProgress?: (p: DownloadProgress) => void
): Promise<string> {
  return ensureDownloaded(choice, onProgress);
}

export async function isModelDownloaded(choice: ModelChoice): Promise<boolean> {
  if (cachedModelPaths[choice]) return true;
  const dest = await getDestinationPath(choice);
  return validateExistingFile(dest, choice);
}

export async function deleteModel(choice: ModelChoice): Promise<void> {
  const dest = await getDestinationPath(choice);
  await cleanupFile(dest);

  const tmp = `${dest}.part`;
  await cleanupFile(tmp);

  delete cachedModelPaths[choice];
}

export async function getModelInfo(choice: ModelChoice): Promise<{
  model: ModelChoice;
  exists: boolean;
  size?: number;
  path?: string;
  filename: string;
  expectedMinSize: number;
  expectedMaxSize: number;
  downloadUrl: string;
}> {
  const spec = MODEL_SPECS[choice];
  const dest = await getDestinationPath(choice);
  const info = await FileSystem.getInfoAsync(dest);

  return {
    model: choice,
    exists: info.exists,
    size: info.exists ? info.size : undefined,
    path: info.exists ? dest : undefined,
    filename: spec.filename,
    expectedMinSize: spec.expectedMinSize,
    expectedMaxSize: spec.expectedMaxSize,
    downloadUrl: spec.url,
  };
}

export async function getAllModelInfo(): Promise<
  Array<{
    model: ModelChoice;
    exists: boolean;
    size?: number;
    path?: string;
    filename: string;
    expectedMinSize: number;
    expectedMaxSize: number;
    downloadUrl: string;
  }>
> {
  return Promise.all([getModelInfo("smollm2"), getModelInfo("qwen15b")]);
}