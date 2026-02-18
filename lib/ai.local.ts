// lib/ai.local.ts
// Offklass AI Runner: Gemma-3-3B ONLY (Q4)
// Tuned for stability on Android tablets

import { initLlama, type LlamaContext } from "llama.rn";
import { ensureModel, isModelDownloaded } from "./LocalModel";
import Constants from "expo-constants";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

let ctx: LlamaContext | null = null;
let inflight: Promise<Message> | null = null;

/* ------------------ REFINED TEACHER PROMPT ------------------ */

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

function isGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["hi", "hello", "hey", "hii", "sup"].some(
    (g) => t === g || t.startsWith(g + " ")
  );
}

function formatMessagesForGemma(messages: Message[]): string {
  let out = "<bos>";
  // Put system rules at the very start (forces strong instruction following)
  out += `<start_of_turn>user\n${SYSTEM_PROMPT}<end_of_turn>\n`;

  for (const msg of messages) {
    if (msg.role === "system") continue;
    const role = msg.role === "user" ? "user" : "model";
    out += `<start_of_turn>${role}\n${msg.content}<end_of_turn>\n`;
  }

  out += "<start_of_turn>model\n";
  return out;
}

/* ------------------ ENGINE MANAGEMENT ------------------ */

async function getContext(): Promise<LlamaContext> {
  if (Constants.appOwnership === "expo") {
    throw new Error("Local AI requires a Development Build.");
  }

  if (ctx) return ctx;

  const modelPath = await ensureModel();

  // Create context (Gemma 3B tuned)
  ctx = await initLlama({
    model: modelPath,

    // 3B is heavier: start lower for stability.
    // If device is strong, you can raise to 2048 later.
    n_ctx: 1536,

    // Threads: 4 is safe on most mid devices.
    // If tablet is strong you can try 6-8.
    n_threads: 4,

    // Usually keep GPU off on Android unless you know it supports it well.
    n_gpu_layers: 0,

    // mlock can crash on some devices due to memory pressure.
    // Keep false for stability.
    use_mlock: false,
  });

  return ctx;
}

/* ------------------ MAIN CALL ------------------ */

function looksIncomplete(out: string): boolean {
  const t = out.trim();
  // Basic “did we at least reach Answer:” check
  if (!t.toLowerCase().includes("answer:")) return true;

  // If it ends mid-word or mid-line, treat as cut
  if (/[a-zA-Z0-9]$/.test(t) && !t.endsWith(".") && !t.endsWith("!") && !t.endsWith("?")) {
    // not perfect, but helps catch abrupt stops
    return true;
  }

  return false;
}

export async function callAI(history: Message[]): Promise<Message> {
  if (inflight) {
    return {
      id: "busy",
      role: "assistant",
      content: "I'm still calculating...",
    };
  }

  const lastUser = [...history].reverse().find((m) => m.role === "user");

  // Local Greeting Handler
  if (lastUser && isGreeting(lastUser.content)) {
    return {
      id: "greet",
      role: "assistant",
      content: "Hi! I'm Offklass AI. Which math topic are we working on today?",
    };
  }

  inflight = (async () => {
    try {
      const engine = await getContext();

      // Keep recent history short (reduces stickiness + saves context)
      const recentHistory = history.slice(-4);

      const prompt = formatMessagesForGemma(recentHistory);

      // First attempt
      const first = await engine.completion({
        prompt,
        n_predict: 512,     // safer than 600 for 3B, reduces RAM spikes
        temperature: 0.15,  // low for math correctness
        top_p: 0.9,
        stop: ["<end_of_turn>", "<eos>"],
      });

      let text = (first.text ?? "").trim();

      // If cut off / missing Answer:, do one quick continuation
      if (looksIncomplete(text)) {
        const second = await engine.completion({
          prompt: prompt + text + "\n",
          n_predict: 256,
          temperature: 0.1,
          top_p: 0.9,
          stop: ["<end_of_turn>", "<eos>"],
        });

        const cont = (second.text ?? "").trim();
        if (cont) text = (text + "\n" + cont).trim();
      }

      return {
        id: Date.now().toString(),
        role: "assistant",
        content: text,
      };
    } catch (err) {
      console.error("AI Error:", err);
      return {
        id: "error",
        role: "assistant",
        content: "I had a little trouble thinking. Can you ask that again?",
      };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/* ------------------ LIFECYCLE ------------------ */

export async function warmupAI(): Promise<void> {
  try {
    const downloaded = await isModelDownloaded();
    if (!downloaded) return;

    const engine = await getContext();
    await engine.completion({
      prompt: "<bos><start_of_turn>user\n1+1<end_of_turn>\n<start_of_turn>model\n",
      n_predict: 8,
      temperature: 0.1,
      top_p: 0.9,
      stop: ["<end_of_turn>", "<eos>"],
    });
  } catch {}
}

export async function releaseContext(): Promise<void> {
  if (!ctx) return;
  try {
    await ctx.release();
  } catch {}
  ctx = null;
}
