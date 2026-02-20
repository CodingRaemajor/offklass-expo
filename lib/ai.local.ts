// lib/ai.local.ts
import { initLlama, type LlamaContext } from "llama.rn";
import {
  ensureModel,
  isModelDownloaded,
  type ModelChoice,
  type ModelProgress,
} from "./LocalModel";
import Constants from "expo-constants";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

let ctx: LlamaContext | null = null;
let loadedModel: ModelChoice | null = null;
let inflight: Promise<Message> | null = null;

/* -------------------- Optional: expose model progress to UI -------------------- */

let lastModelProgress: ModelProgress | null = null;
export function getLastModelProgress() {
  return lastModelProgress;
}

/* ------------------ REFINED TEACHER PROMPT (ORIGINAL) ------------------ */

const SYSTEM_PROMPT = `
You are Offklass AI.
You are a tutor for Grades 4.
Your goal:
- Give correct answers
- Explain simply
- Always finish the answer

====================
MATH RULES (STRICT)
====================

1. Solve ONLY the given question.
- Do not change numbers.
- Do not rewrite the problem.

2. Allowed methods ONLY:
- Place value: ADD values (example: 300 + 40 + 5)
- Multiplication: PARTIAL PRODUCTS only
  Example:
  34 x 23
  34 x 20
  34 x 3
  Add the results
- Division: simple sharing or grouping

3. Never use:
- Algebra
- Variables
- Formulas
- Powers (², ³)
- Advanced math words

4. Steps rules:
- Use 3 to 5 steps only
- One small action per step
- Very simple words
- Do not skip steps

====================
RESPONSE FORMAT (MANDATORY)
====================

Problem: <repeat the exact question>

Steps:
- Step 1: <simple step>
- Step 2: <simple step>
- Step 3: <finish calculation>

Answer: <final answer>

====================
COMPLETION RULE
====================

- Never stop early
- Never omit the final answer
- If the answer is incomplete, regenerate the full response

====================
NON-MATH QUESTIONS
====================

- Answers should be brief and detailed depending on the question

====================
FINAL CHECK
====================

Before answering, check:
- The steps match the answer
- The answer is complete
- The explanation fits Grades 4
`.trim();

/* ------------------ HELPERS ------------------ */

function formatMessagesForGemma(messages: Message[]): string {
  let out = "<bos>";
  out += `<start_of_turn>user\n${SYSTEM_PROMPT}<end_of_turn>\n`;
  for (const msg of messages) {
    if (msg.role === "system") continue;
    const role = msg.role === "user" ? "user" : "model";
    out += `<start_of_turn>${role}\n${msg.content}<end_of_turn>\n`;
  }
  out += "<start_of_turn>model\n";
  return out;
}

function isGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["hi", "hello", "hey", "hii", "sup"].some(
    (g) => t === g || t.startsWith(g + " ")
  );
}

/**
 * IMPORTANT:
 * - Expo Go cannot use llama.rn (native).
 * - Dev build + release build are OK.
 */
async function getContext(choice: ModelChoice = "gemma2b"): Promise<LlamaContext> {
  // Expo Go check
  if (Constants.appOwnership === "expo") {
    throw new Error("Local AI requires a Development Build (not Expo Go).");
  }

  // Reuse existing context if same model already loaded
  if (ctx && loadedModel === choice) return ctx;

  // Ensure model is available (Option 2: download on first run with resume+retry)
  const modelPath = await ensureModel({
    maxRetries: 4,
    onProgress: (p) => {
      lastModelProgress = p;

      // Useful logs (especially in release)
      if (p.phase === "downloading") {
        const pct = typeof p.percent === "number" ? p.percent.toFixed(1) : "";
        console.log(`[Model] ${p.phase} ${pct}%`, p.message ?? "");
      } else {
        console.log(`[Model] ${p.phase}`, p.message ?? "");
      }
    },
  });

  // Release previous context if switching/reloading
  if (ctx) {
    try {
      await ctx.release();
    } catch {}
    ctx = null;
    loadedModel = null;
  }

  // Create llama context
  ctx = await initLlama({
    model: modelPath,
    n_ctx: 2048,
    n_threads: 4,
    use_mlock: true,
  });

  loadedModel = choice;
  return ctx;
}

/* ------------------ QUIZ GENERATION ------------------ */

export interface GeneratedQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  explanation: string;
}

const QUIZ_GENERATION_PROMPT = `
You are Offklass AI. Create 5 multiple choice questions for Grade 2.
Use the transcript to create REAL math options.

### GOOD EXAMPLE TO FOLLOW ###
Question: In the number 47, what does the 4 represent?
A: 4 ones
B: 4 tens
C: 7 tens
D: 400
Answer: 4 tens
Explanation: The 4 is in the tens place, so it represents 4 tens.

### RULES ###
1. Options must be specific values (like "40" or "7 ones"), NOT just "1, 2, 3, 4".
2. The "Answer" must be the text of the correct option.
3. Keep it very simple.

Transcript:
`;

export async function generateQuizFromTranscript(
  transcript: string,
  lessonTitle: string,
  topic: string
): Promise<GeneratedQuestion[]> {
  try {
    const engine = await getContext("gemma2b");
    const prompt =
      QUIZ_GENERATION_PROMPT + transcript + "\n\nGenerate 5 questions:";

    const { text } = await engine.completion({
      prompt: formatMessagesForGemma([{ id: "1", role: "user", content: prompt }]),
      n_predict: 1000,
      temperature: 0.0,
      top_p: 0.1,
      stop: ["<end_of_turn>", "<eos>"],
    });

    console.log("--- AI RAW RESPONSE START ---");
    console.log(text);
    console.log("--- AI RAW RESPONSE END ---");

    return parseQuizResponse(text.trim(), lessonTitle, topic);
  } catch (err: any) {
    console.error("Quiz generation error:", err?.message ?? err);
    return [];
  }
}

function parseQuizResponse(
  response: string,
  lessonTitle: string,
  topic: string
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];

  const cleanResponse = response
    .replace(/\*\*/g, "")
    .replace(/Question\s*\d+:/gi, "Question:");

  const rawBlocks = cleanResponse
    .split(/Question:/i)
    .filter((b) => b.trim().length > 10);

  rawBlocks.forEach((block, index) => {
    try {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const questionText = lines[0];

      const optA = lines
        .find((l) => /^A[:\s.-]/i.test(l))
        ?.replace(/^A[:\s.-]/i, "")
        .trim();
      const optB = lines
        .find((l) => /^B[:\s.-]/i.test(l))
        ?.replace(/^B[:\s.-]/i, "")
        .trim();
      const optC = lines
        .find((l) => /^C[:\s.-]/i.test(l))
        ?.replace(/^C[:\s.-]/i, "")
        .trim();
      const optD = lines
        .find((l) => /^D[:\s.-]/i.test(l))
        ?.replace(/^D[:\s.-]/i, "")
        .trim();

      const answerLine = lines
        .find((l) => /^(Answer|Correct|Correct Answer)[:\s.-]/i.test(l))
        ?.replace(/^(Answer|Correct|Correct Answer)[:\s.-]/i, "")
        .trim();

      const explanation = lines
        .find((l) => /^Explanation[:\s.-]/i.test(l))
        ?.replace(/^Explanation[:\s.-]/i, "")
        .trim();

      if (questionText && optA && optB && optC && optD && answerLine) {
        const options = [optA, optB, optC, optD];

        let correctIndex = options.findIndex(
          (opt) =>
            answerLine.toLowerCase().includes(opt.toLowerCase()) ||
            opt.toLowerCase().includes(answerLine.toLowerCase())
        );

        if (correctIndex === -1) {
          const firstChar = answerLine.charAt(0).toUpperCase();
          if (["A", "B", "C", "D"].includes(firstChar)) {
            correctIndex = firstChar.charCodeAt(0) - 65;
          }
        }

        if (correctIndex >= 0 && correctIndex <= 3) {
          questions.push({
            id: Date.now() + index,
            question: questionText,
            options,
            correctAnswer: options[correctIndex],
            topic,
            explanation: explanation || "Keep up the great work!",
          });
        }
      }
    } catch (err) {
      console.error("Parse Error:", err);
    }
  });

  return questions;
}

/* ------------------ CHAT CALL ------------------ */

export async function callAI(history: Message[]): Promise<Message> {
  if (inflight)
    return { id: "busy", role: "assistant", content: "I'm still calculating..." };

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (lastUser && isGreeting(lastUser.content)) {
    return {
      id: "greet",
      role: "assistant",
      content: "Hi! I'm Offklass AI. Which math topic are we working on today?",
    };
  }

  inflight = (async () => {
    try {
      const engine = await getContext("gemma2b");

      const { text } = await engine.completion({
        prompt: formatMessagesForGemma(history.slice(-4)),
        n_predict: 600,
        temperature: 0.1,
        top_p: 0.9,
        stop: ["<end_of_turn>", "<eos>"],
      });

      return {
        id: Date.now().toString(),
        role: "assistant",
        content: text.trim(),
      };
    } catch (err: any) {
      const msg = err?.message ?? String(err);

      // Better user-facing errors (especially for release)
      if (msg.includes("Not enough free storage")) {
        return {
          id: "error_storage",
          role: "assistant",
          content:
            "AI needs more free storage to download the model. Please free up space and try again.",
        };
      }
      if (msg.includes("Development Build")) {
        return {
          id: "error_devbuild",
          role: "assistant",
          content:
            "Local AI works only in a Development Build or Release build (not Expo Go).",
        };
      }
      if (msg.toLowerCase().includes("download")) {
        return {
          id: "error_download",
          role: "assistant",
          content:
            "AI model download failed. Please check your internet and try again.",
        };
      }

      console.error("[AI] Error:", msg);
      return { id: "error", role: "assistant", content: "AI Error" };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/* ------------------ WARMUP / RELEASE ------------------ */

export async function warmupAI(): Promise<void> {
  try {
    // only warmup if model is already present
    if (!(await isModelDownloaded())) return;
    const engine = await getContext("gemma2b");
    await engine.completion({ prompt: "<bos>", n_predict: 1 });
  } catch {}
}

export async function releaseContext(): Promise<void> {
  if (ctx) {
    try {
      await ctx.release();
    } catch {}
    ctx = null;
    loadedModel = null;
  }
}