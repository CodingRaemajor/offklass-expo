// lib/ai.local.ts
// Finalized Offklass AI Runner: Optimized for Gemma-3-1B (Q4)
import { initLlama, type LlamaContext } from "llama.rn";
import { ensureModel, isModelDownloaded, type ModelChoice } from "./LocalModel";
import Constants from "expo-constants";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

let ctx: LlamaContext | null = null;
let loadedModel: ModelChoice | null = null;
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
  return ["hi", "hello", "hey", "hii", "sup"].some(g => t === g || t.startsWith(g + " "));
}

function formatMessagesForGemma(messages: Message[]): string {
  let out = "<bos>";
  // Inject rules into the start of the turn sequence for strict instruction following
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

async function getContext(choice: ModelChoice = "gemma1b"): Promise<LlamaContext> {
  if (Constants.appOwnership === "expo") throw new Error("Local AI requires a Development Build.");
  if (ctx && loadedModel === choice) return ctx;

  const modelPath = await ensureModel(choice);
  if (ctx) {
    try { await ctx.release(); } catch {}
  } 

  ctx = await initLlama({
    model: modelPath,
    n_ctx: 2048,        // Expanded context window
    n_threads: 4,
    n_gpu_layers: 0,
    use_mlock: true,    // Locks model in RAM for speed
  });

  loadedModel = choice;
  return ctx;
}

/* ------------------ MAIN CALL ------------------ */

export async function callAI(history: Message[]): Promise<Message> {
  if (inflight) return { id: "busy", role: "assistant", content: "I'm still calculating..." };

  const lastUser = [...history].reverse().find(m => m.role === "user");
  
  // Local Greeting Handler
  if (lastUser && isGreeting(lastUser.content)) {
    return { 
      id: "greet", 
      role: "assistant", 
      content: "Hi! I'm Offklass AI. Which math topic are we working on today?" 
    };
  }

  inflight = (async () => {
    try {
      const engine = await getContext("gemma1b");

      // FIX: Only take the last 4 messages to prevent "topic stickiness"
      const recentHistory = history.slice(-4); 

      const { text } = await engine.completion({
        prompt: formatMessagesForGemma(recentHistory),
        n_predict: 600,      // FIX: Prevents response cutoff
        temperature: 0.1,    // FIX: Low temp for exact math results
        top_p: 0.9,
        stop: ["<end_of_turn>", "<eos>"],
      });

      return { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: text.trim() 
      };
    } catch (err) {
      console.error("AI Error:", err);
      return { 
        id: "error", 
        role: "assistant", 
        content: "I had a little trouble thinking. Can you ask that again?" 
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
    const engine = await getContext("gemma1b");
    await engine.completion({
      prompt: "<bos><start_of_turn>user\n1+1<end_of_turn>\n<start_of_turn>model\n",
      n_predict: 5,
    });
  } catch {}
}

export async function releaseContext(): Promise<void> {
  if (!ctx) return;
  try { await ctx.release(); } catch {}
  ctx = null;
  loadedModel = null;
}