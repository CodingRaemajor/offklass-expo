// lib/ai.local.ts
import { initLlama, type LlamaContext } from "llama.rn";
import { ensureModel, isModelDownloaded, type ModelChoice } from "./LocalModel";
import Constants from "expo-constants";
import { tryMathFallback } from "./mathFallback";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

let ctx: LlamaContext | null = null;
let loadedModel: ModelChoice | null = null;
let inflight: Promise<Message> | null = null;

/* ------------------ REFINED TEACHER PROMPT (ORIGINAL) ------------------ */

function getSystemPrompt(grade: number, languageName: string, concept: string): string {
  return `
You are Offklass AI: a warm, patient math teacher who loves when students ask questions. You explain to a grade ${grade} student in ${languageName}. Use VERY SIMPLE words like you're talking to a 5-year-old.

Before you explain, briefly encourage them (e.g. "Great question!" or "I'm so glad you asked—that's how we learn!"). Then explain the concept. Be kind and supportive so they feel safe to keep asking.

The concept to explain: "${concept}"

EXPLANATION RULES - Write on the board step-by-step (VERY SIMPLE):
1. Stack the numbers (standard way)
2. Show the solving process step by step
3. Write what you're doing: "0 plus 0 is 0" then show the result
4. Keep it SHORT - minimal text, just the math steps
5. NO deep explanations - just show how to solve
6. Use VERY simple language - no math jargon, use words like "add" not "addition", "take away" not "subtract"
7. Write like you're solving on a board: "First...", "Next...", "Then..."
8. Use words a 5-year-old would understand

EXAMPLES OF SIMPLE EXPLANATIONS:

For "Addition":
"Let me show you:
  3
+ 2
---
  ___
  
First, ones: 3 plus 2 is 5
Write 5:
  3
+ 2
---
  5"

For "Multiplication":
"Let me solve this:
  3
× 4
---
  ___
  
4 times 3 is 12
Write 12:
  3
× 4
---
 12"

Provide a clear, SIMPLE step-by-step explanation that a grade ${grade} student can easily follow.
`.trim();
}

/* ------------------ HELPERS ------------------ */

function formatMessagesForGemma(messages: Message[], systemPrompt: string = ""): string {
  let out = "<bos>";
  if (systemPrompt) {
    out += `<start_of_turn>user\n${systemPrompt}<end_of_turn>\n`;
  }
  for (const msg of messages) {
    if (msg.role === "system") continue;
    const role = msg.role === "user" ? "user" : "model";
    out += `<start_of_turn>${role}\n${msg.content}<end_of_turn>\n`;
  }
  out += "<start_of_turn>model\n";
  return out;
}

async function getContext(choice: ModelChoice = "gemma2b"): Promise<LlamaContext> {
  if (Constants.appOwnership === "expo") throw new Error("Local AI requires a Development Build.");
  if (ctx && loadedModel === choice) return ctx;

  const modelPath = await ensureModel();

  if (ctx) {
    try {
      await ctx.release();
    } catch {}
  }

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
You are Offklass AI. Create 5 multiple choice questions for Grade 4.
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
    const prompt = QUIZ_GENERATION_PROMPT + transcript + "\n\nGenerate 5 questions:";

    const { text } = await engine.completion({
      prompt: formatMessagesForGemma([{ id: "1", role: "user", content: prompt }]),
      n_predict: 1000,
      temperature: 0.0,
      top_p: 0.1,
    });

    console.log("--- AI RAW RESPONSE START ---");
    console.log(text);
    console.log("--- AI RAW RESPONSE END ---");

    return parseQuizResponse(text.trim(), lessonTitle, topic);
  } catch (err) {
    console.error("Quiz generation error:", err);
    return [];
  }
}

function parseQuizResponse(response: string, lessonTitle: string, topic: string): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];

  const cleanResponse = response
    .replace(/\*\*/g, "")
    .replace(/Question\s*\d+:/gi, "Question:");

  const rawBlocks = cleanResponse.split(/Question:/i).filter((b) => b.trim().length > 10);

  rawBlocks.forEach((block, index) => {
    try {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const questionText = lines[0];

      const optA = lines.find((l) => /^A[:\s.-]/i.test(l))?.replace(/^A[:\s.-]/i, "").trim();
      const optB = lines.find((l) => /^B[:\s.-]/i.test(l))?.replace(/^B[:\s.-]/i, "").trim();
      const optC = lines.find((l) => /^C[:\s.-]/i.test(l))?.replace(/^C[:\s.-]/i, "").trim();
      const optD = lines.find((l) => /^D[:\s.-]/i.test(l))?.replace(/^D[:\s.-]/i, "").trim();

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

        let correctIndex = -1;

        correctIndex = options.findIndex(
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

/* ------------------ AI CHAT ------------------ */

function isGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["hi", "hello", "hey", "hii", "sup"].some((g) => t === g || t.startsWith(g + " "));
}

export async function callAI(history: Message[]): Promise<Message> {
  if (inflight) return { id: "busy", role: "assistant", content: "I'm still calculating..." };

  const lastUser = [...history].reverse().find((m) => m.role === "user");

  // Greeting shortcut
  if (lastUser && isGreeting(lastUser.content)) {
    return {
      id: "greet",
      role: "assistant",
      content: "Hi! I'm Offklass AI. Which math topic are we working on today?",
    };
  }

  // ✅ MATH FALLBACK (now supports advanced expressions + equations offline)
  if (lastUser) {
    const fallback = tryMathFallback(lastUser.content);
    if (fallback) {
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: fallback,
      };
    }
  }

  inflight = (async () => {
    try {
      const engine = await getContext("gemma2b");
      const { text } = await engine.completion({
        prompt: formatMessagesForGemma(history.slice(-4)),
        n_predict: 600,
        temperature: 0,
        top_p: 0.1,
        stop: ["<end_of_turn>", "<eos>"],
      });
      return { id: Date.now().toString(), role: "assistant", content: text.trim() };
    } catch (err) {
      return { id: "error", role: "assistant", content: "AI Error" };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function warmupAI(): Promise<void> {
  try {
    if (!(await isModelDownloaded())) return;
    const engine = await getContext("gemma2b");
    await engine.completion({ prompt: "<bos>", n_predict: 1 });
  } catch {}
}

export async function releaseContext(): Promise<void> {
  if (ctx) {
    await ctx.release();
    ctx = null;
    loadedModel = null;
  }
}