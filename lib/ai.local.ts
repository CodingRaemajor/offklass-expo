// lib/ai.local.ts
import { initLlama, type LlamaContext } from "llama.rn";
import Constants from "expo-constants";
import { tryMathFallback } from "./mathFallback";
import {
  ensureModel,
  isModelDownloaded,
  type ModelChoice,
  type DownloadProgress,
} from "./LocalModel";

/* ============================== TYPES ============================== */

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export interface GeneratedQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  explanation: string;
}

/* ============================== STATE ============================== */

type AIState = "idle" | "downloading" | "loading" | "ready" | "error";

let ctx: LlamaContext | null = null;
let loadedModel: ModelChoice | null = null;
let inflight: Promise<Message> | null = null;

let aiState: AIState = "idle";
let aiProgress: DownloadProgress | null = null;
let aiError: string | null = null;

const listeners = new Set<() => void>();
function notify() {
  for (const fn of listeners) fn();
}

export function subscribeAIStatus(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAIStatus() {
  return { aiState, aiProgress, aiError, hasCtx: !!ctx };
}

function setState(next: AIState, err?: string | null) {
  aiState = next;
  aiError = err ?? null;
  notify();
}

/* ============================== CLEANING ============================== */

function stripPromptTokens(input: string) {
  return (input ?? "").replace(
    /<\s*\/?\s*(start_of_turn|end_of_turn|bos|eos)\s*>/gi,
    ""
  );
}

// ✅ removes leaked tokens + markdown (so UI doesn't show raw ** or * lists)
export function cleanGemmaOutput(text: string): string {
  if (!text) return "";

  return text
    // markdown cleanup
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/^\*\s+/gm, "• ") // * bullet
    .replace(/`{1,3}/g, "") // backticks
    // gemma tokens cleanup
    .replace(/<\s*\/?\s*(start_of_turn|end_of_turn|bos|eos)\s*>/gi, "")
    // whitespace normalize
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================== PROMPT FORMAT ============================== */

function formatMessagesForGemma(messages: Message[], systemPrompt: string = ""): string {
  let out = "<bos>";

  if (systemPrompt) {
    out += `<start_of_turn>user\n${stripPromptTokens(systemPrompt)}<end_of_turn>\n`;
  }

  for (const msg of messages) {
    if (msg.role === "system") continue;
    const role = msg.role === "user" ? "user" : "model";
    out += `<start_of_turn>${role}\n${stripPromptTokens(msg.content)}<end_of_turn>\n`;
  }

  out += "<start_of_turn>model\n";
  return out;
}

/* ============================== MODEL / CONTEXT ============================== */

async function getContext(choice: ModelChoice = "gemma2b"): Promise<LlamaContext> {
  if (Constants.appOwnership === "expo") {
    throw new Error("Local AI requires a Development Build.");
  }

  if (ctx && loadedModel === choice) return ctx;

  const already = await isModelDownloaded();
  if (!already) setState("downloading");

  const modelPath = await ensureModel((p) => {
    aiProgress = p;
    if (aiState !== "downloading") aiState = "downloading";
    notify();
  });

  if (ctx) {
    try {
      await ctx.release();
    } catch {}
  }

  await new Promise((r) => setTimeout(r, 350));

  setState("loading");

  ctx = await initLlama({
    model: modelPath,
    n_ctx: 1024,
    n_threads: 4,
    use_mlock: false,
  });

  loadedModel = choice;
  aiProgress = null;
  setState("ready");
  return ctx;
}

export async function prepareAI(): Promise<void> {
  try {
    await getContext("gemma2b");
  } catch (e: any) {
    setState("error", String(e?.message ?? e));
    throw e;
  }
}

/* ============================== QUIZ GENERATION ============================== */

// ✅ Efficient, stable prompt: forces strict format + concrete numeric options + transcript grounding.
const QUIZ_GENERATION_PROMPT = `
You are Offklass AI. Create exactly 5 multiple choice math questions for Grade 4 using ONLY the transcript facts.

OUTPUT FORMAT (STRICT, NO MARKDOWN):
Q1: <question>
A) <option>
B) <option>
C) <option>
D) <option>
ANS: <exact option text>
WHY: <one short sentence explanation>

RULES:
- Each question must be grade-4 appropriate.
- Options must be REAL values (no "1,2,3,4" filler).
- Exactly 4 options per question.
- "ANS:" must match ONE option exactly (copy-paste).
- Keep "WHY:" under 15 words.
- Do NOT add extra commentary.
- Avoid tricky wording; test understanding.

Transcript:
`;

export async function generateQuizFromTranscript(
  transcript: string,
  lessonTitle: string,
  topic: string
): Promise<GeneratedQuestion[]> {
  try {
    const engine = await getContext("gemma2b");

    // Keep prompt smaller + focused to reduce hallucinations
    const trimmedTranscript = (transcript ?? "").slice(0, 6000);

    const prompt =
      QUIZ_GENERATION_PROMPT +
      trimmedTranscript +
      `\n\nLesson: ${lessonTitle}\nTopic: ${topic}\n\nCreate the 5 questions now.`;

    const { text } = await engine.completion({
      prompt: formatMessagesForGemma([{ id: "qz1", role: "user", content: prompt }]),
      n_predict: 1100,
      temperature: 0.1,
      top_p: 0.9,
      stop: ["<end_of_turn>", "<eos>"],
    });

    return parseQuizResponse(cleanGemmaOutput(text), lessonTitle, topic);
  } catch (err) {
    console.error("Quiz generation error:", err);
    return [];
  }
}

// ✅ Robust parser for the strict Q/A/B/C/D/ANS/WHY format
function parseQuizResponse(
  response: string,
  _lessonTitle: string,
  topic: string
): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  const txt = (response ?? "").replace(/\r\n/g, "\n").trim();
  if (!txt) return out;

  // Split by Q1/Q2...
  const blocks = txt
    .split(/\n(?=Q[1-5]:\s*)/g)
    .map((b) => b.trim())
    .filter(Boolean);

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    const q = b.match(/^Q\d+:\s*(.+)$/m)?.[1]?.trim();
    const A = b.match(/^A\)\s*(.+)$/m)?.[1]?.trim();
    const B = b.match(/^B\)\s*(.+)$/m)?.[1]?.trim();
    const C = b.match(/^C\)\s*(.+)$/m)?.[1]?.trim();
    const D = b.match(/^D\)\s*(.+)$/m)?.[1]?.trim();
    const ans = b.match(/^ANS:\s*(.+)$/m)?.[1]?.trim();
    const why = b.match(/^WHY:\s*(.+)$/m)?.[1]?.trim();

    if (!q || !A || !B || !C || !D || !ans) continue;

    const options = [A, B, C, D];

    // Ensure answer matches one option exactly; otherwise attempt soft match
    let correct = options.find((o) => o === ans);
    if (!correct) {
      const lower = ans.toLowerCase();
      correct =
        options.find((o) => o.toLowerCase() === lower) ||
        options.find((o) => lower.includes(o.toLowerCase())) ||
        options.find((o) => o.toLowerCase().includes(lower));
    }
    if (!correct) continue;

    out.push({
      id: Date.now() + i,
      question: q,
      options,
      correctAnswer: correct,
      topic,
      explanation: why && why.length ? why : "Good job! Keep practicing!",
    });
  }

  // Always return max 5
  return out.slice(0, 5);
}

/* ============================== CHAT ============================== */

function isGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["hi", "hello", "hey", "hii", "sup"].some((g) => t === g || t.startsWith(g + " "));
}

export async function callAI(history: Message[]): Promise<Message> {
  // gates
  if (aiState === "downloading") {
    const pct = aiProgress ? `${aiProgress.percent.toFixed(1)}%` : "";
    return { id: "dl", role: "assistant", content: `Downloading my AI brain… 🧠 ${pct}`.trim() };
  }
  if (aiState === "loading") {
    return { id: "ld", role: "assistant", content: "Warming up… 🔥 Almost ready!" };
  }
  if (aiState === "error") {
    return { id: "err", role: "assistant", content: "AI isn’t ready. Tap Retry to fix me." };
  }
  if (inflight) return { id: "busy", role: "assistant", content: "I'm still thinking..." };

  const lastUser = [...history].reverse().find((m) => m.role === "user");

  if (lastUser && isGreeting(lastUser.content)) {
    return {
      id: "greet",
      role: "assistant",
      content: "Hi! I'm Offklass AI. Tell me your grade and the math topic 😊",
    };
  }

  // math fallback (fast + stable)
  if (lastUser) {
    const fallback = tryMathFallback(lastUser.content);
    if (fallback) return { id: Date.now().toString(), role: "assistant", content: fallback };
  }

  inflight = (async () => {
    try {
      const engine = await getContext("gemma2b");

      const { text } = await engine.completion({
        prompt: formatMessagesForGemma(history.slice(-4)),
        n_predict: 520,
        temperature: 0.2,
        top_p: 0.9,
        stop: ["<end_of_turn>", "<eos>"],
      });

      const cleaned = cleanGemmaOutput(text);

      return {
        id: Date.now().toString(),
        role: "assistant",
        content: cleaned.length ? cleaned : "I got an empty answer. Try again!",
      };
    } catch (e: any) {
      setState("error", String(e?.message ?? e ?? "AI Error"));
      return { id: "error", role: "assistant", content: "AI Error" };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/* ============================== UTILS ============================== */

export async function warmupAI(): Promise<void> {
  try {
    if (!(await isModelDownloaded())) return;
    const engine = await getContext("gemma2b");
    await engine.completion({ prompt: "<bos>", n_predict: 1 });
  } catch {}
}

export async function releaseContext(): Promise<void> {
  try {
    if (ctx) {
      await ctx.release();
      ctx = null;
      loadedModel = null;
    }
  } finally {
    aiProgress = null;
    setState("idle");
  }
}