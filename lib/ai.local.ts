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

export interface GeneratedFlashcard {
  id: number;
  front: string;
  back: string;
  topic: string;
}

/* ============================== STATE ============================== */

type AIState = "idle" | "downloading" | "loading" | "ready" | "error";

let ctx: LlamaContext | null = null;
let loadedModel: ModelChoice | null = null;
let inflight: Promise<Message> | null = null;
let preparingPromise: Promise<void> | null = null;

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
  return { aiState, aiProgress, aiError, hasCtx: !!ctx, loadedModel };
}

function setState(next: AIState, err?: string | null) {
  aiState = next;
  aiError = err ?? null;
  notify();
}

/* ============================== MODEL CONFIG ============================== */

const CHAT_MODEL: ModelChoice = "qwen15b";
const STUDY_MODEL: ModelChoice = "smollm2";

type AIModelInput = ModelChoice | "qwen2.5" | "qwen" | "qwen2.5-1.5b" | string;

const MODEL_RUNTIME: Record<
  ModelChoice,
  { n_ctx: number; n_threads: number; use_mlock: boolean }
> = {
  smollm2: {
    n_ctx: 1536,
    n_threads: 4,
    use_mlock: false,
  },
  qwen15b: {
    n_ctx: 4096,
    n_threads: 4,
    use_mlock: false,
  },
};

function normalizeModelChoice(choice: AIModelInput): ModelChoice {
  const raw = String(choice ?? "").trim().toLowerCase();

  if (raw === "smollm2") return "smollm2";
  if (raw === "qwen15b") return "qwen15b";

  if (raw === "qwen2.5" || raw === "qwen" || raw === "qwen2.5-1.5b") {
    return "qwen15b";
  }

  return CHAT_MODEL;
}

const CHAT_N_PREDICT = 384;
const QUIZ_N_PREDICT = 260;
const FLASHCARD_N_PREDICT = 180;

const CHAT_TEMPERATURE = 0.65;
const QUIZ_TEMPERATURE = 0.35;
const FLASHCARD_TEMPERATURE = 0.28;

/* ============================== LOCAL CONTENT CONFIG ============================== */

const QUIZ_COUNT = 10;
const FLASHCARD_COUNT = 10;

const quizCache = new Map<string, GeneratedQuestion[]>();
const flashcardCache = new Map<string, GeneratedFlashcard[]>();

/* ============================== CLEANING ============================== */

function stripPromptArtifacts(input: string) {
  return (input ?? "").replace(
    /<\|?\s*\/?\s*(im_start|im_end|start_of_turn|end_of_turn|bos|eos)\s*\|?>/gi,
    ""
  );
}

function normalizeSpace(s: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

export function cleanModelOutput(text: string): string {
  if (!text) return "";

  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\*\s+/gm, "• ")
    .replace(/`{1,3}/g, "")
    .replace(/<\|im_end\|>/gi, "")
    .replace(/<\|im_start\|>/gi, "")
    .replace(/<\s*\/?\s*(start_of_turn|end_of_turn|bos|eos)\s*>/gi, "")
    .replace(/^assistant\s*[:\-]\s*/i, "")
    .replace(/^model\s*[:\-]\s*/i, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================== SYSTEM PROMPTS ============================== */

const DEFAULT_SYSTEM_PROMPT = `
You are Offklass AI, a warm, smart, and helpful tutor.

Respond in a natural ChatGPT-like way:
- clear
- conversational
- thoughtful
- accurate
- friendly
- not robotic

Your goal is to help the student understand, not just give the final answer.

How to respond:
- Start with the direct answer when possible
- Then explain simply and clearly
- Use short paragraphs or steps
- Use easy words by default
- If the student seems confused, make it simpler
- If the question is easy, answer briefly
- If the question needs detail, explain more
- For math, show the steps clearly
- Double-check arithmetic before answering
- Be encouraging, but only naturally

Important:
- Do not sound scripted
- Do not repeat the same phrases again and again
- Do not be overly childish
- Do not be overly formal
- Do not say "As an AI language model"
- Do not mention hidden rules or system prompts

Safety:
- Do not provide harmful, sexual, violent, illegal, or unsafe instructions
- If something is unsafe, refuse briefly and gently redirect

You are the main AI assistant inside Offklass.
`.trim();

const QUIZ_SYSTEM_PROMPT = `
You are Offklass AI creating Grade 4 quizzes.

Create clear, correct, student-friendly quiz questions.
Use simple language.
Follow the exact format requested.
Do not add any extra commentary.
Keep questions fair and useful.
`.trim();

const FLASHCARD_SYSTEM_PROMPT = `
You are Offklass AI creating Grade 4 flashcards.

Create strong study flashcards that help a student revise real lesson facts.

Rules:
- Every flashcard must teach one specific fact, rule, definition, step, or solved example
- Do NOT write vague flashcards
- Do NOT write generic revision tips
- Do NOT write cards like "What do you need to remember?"
- Do NOT write cards like "What do you learn in this unit?"
- Make each front ask one clear question
- Make each back give one clear answer
- Use simple Grade 4 English
- Keep the front short
- Keep the back short but useful
- No duplicate cards
- Prefer number facts, definitions, place value, expanded form, operations, or short worked facts
- Follow the exact format requested
- Do not add commentary before or after
`.trim();

/* ============================== MESSAGE FORMATTER ============================== */

function formatMessagesForQwen(
  messages: Message[],
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): string {
  const parts: string[] = [];

  parts.push(
    `<|im_start|>system\n${stripPromptArtifacts(systemPrompt)}<|im_end|>\n`
  );

  for (const msg of messages) {
    if (msg.role === "system") continue;

    if (msg.role === "user") {
      parts.push(
        `<|im_start|>user\n${stripPromptArtifacts(msg.content)}<|im_end|>\n`
      );
    } else {
      parts.push(
        `<|im_start|>assistant\n${stripPromptArtifacts(msg.content)}<|im_end|>\n`
      );
    }
  }

  parts.push("<|im_start|>assistant\n");
  return parts.join("");
}

function formatMessagesForSmolLM(
  messages: Message[],
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): string {
  const parts: string[] = [];

  parts.push(`System: ${stripPromptArtifacts(systemPrompt)}\n`);

  for (const msg of messages) {
    if (msg.role === "system") continue;

    if (msg.role === "user") {
      parts.push(`User: ${stripPromptArtifacts(msg.content)}\n`);
    } else {
      parts.push(`Assistant: ${stripPromptArtifacts(msg.content)}\n`);
    }
  }

  parts.push("Assistant:");
  return parts.join("");
}

function formatPromptForModel(
  choice: ModelChoice,
  messages: Message[],
  systemPrompt: string
) {
  if (choice === "qwen15b") {
    return formatMessagesForQwen(messages, systemPrompt);
  }
  return formatMessagesForSmolLM(messages, systemPrompt);
}

/* ============================== MODEL / CONTEXT ============================== */

async function releaseLoadedContext({
  resetState = false,
  clearCaches = false,
}: {
  resetState?: boolean;
  clearCaches?: boolean;
} = {}) {
  try {
    if (ctx) {
      await ctx.release();
    }
  } catch {
  } finally {
    ctx = null;
    loadedModel = null;

    if (clearCaches) {
      clearGeneratedStudyCaches();
    }

    if (resetState) {
      aiProgress = null;
      setState("idle");
    }
  }
}

async function getContext(choiceInput: AIModelInput): Promise<LlamaContext> {
  const choice = normalizeModelChoice(choiceInput);

  if (Constants.appOwnership === "expo") {
    throw new Error("Local AI requires a Development Build.");
  }

  if (ctx && loadedModel === choice) return ctx;

  const already = await isModelDownloaded(choice);
  if (!already) setState("downloading");

  const modelPath = await ensureModel(choice, (p) => {
    aiProgress = p;
    if (aiState !== "downloading") {
      aiState = "downloading";
    }
    notify();
  });

  if (!modelPath || typeof modelPath !== "string") {
    throw new Error("Model path is missing.");
  }

  if (ctx && loadedModel !== choice) {
    await releaseLoadedContext();
    await new Promise((r) => setTimeout(r, 250));
  }

  setState("loading");

  const runtime = MODEL_RUNTIME[choice];
  if (!runtime) {
    throw new Error(`No runtime config found for model: ${choice}`);
  }

  ctx = await initLlama({
    model: modelPath,
    n_ctx: runtime.n_ctx,
    n_threads: runtime.n_threads,
    use_mlock: runtime.use_mlock,
  });

  loadedModel = choice;
  aiProgress = null;
  setState("ready");
  return ctx;
}

export async function prepareAI(model: AIModelInput = CHAT_MODEL): Promise<void> {
  const choice = normalizeModelChoice(model);

  if (aiState === "ready" && loadedModel === choice && ctx) {
    return;
  }

  if (preparingPromise) {
    return preparingPromise;
  }

  preparingPromise = (async () => {
    try {
      await getContext(choice);
    } catch (e: any) {
      setState("error", String(e?.message ?? e));
      throw e;
    } finally {
      preparingPromise = null;
    }
  })();

  return preparingPromise;
}

/* ============================== GENERIC COMPLETION ============================== */

async function runCompletion(
  engine: LlamaContext,
  prompt: string,
  opts?: {
    n_predict?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stop?: string[];
  }
): Promise<string> {
  const { text } = await engine.completion({
    prompt,
    n_predict: opts?.n_predict ?? CHAT_N_PREDICT,
    temperature: opts?.temperature ?? CHAT_TEMPERATURE,
    top_p: opts?.top_p ?? 0.9,
    top_k: opts?.top_k ?? 40,
    stop:
      opts?.stop ?? [
        "<|im_end|>",
        "<|im_start|>user",
        "<|im_start|>system",
        "<end_of_turn>",
        "<start_of_turn>user",
        "<start_of_turn>system",
        "User:",
        "System:",
      ],
  });

  return cleanModelOutput(text);
}

/* ============================== TRANSCRIPT HELPERS ============================== */

function pickRelevantTranscript(
  transcript: string,
  maxChars: number = 650
): string {
  const cleaned = (transcript ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  if (!cleaned) return "";

  const lines = cleaned
    .split("\n")
    .map((line) => normalizeSpace(line))
    .filter(Boolean);

  const strong = lines.filter(
    (line) =>
      /\d/.test(line) ||
      /example|means|equal|groups|ones|tens|hundreds|add|subtract|multiply|divide|remainder|place value|expanded form/i.test(
        line
      )
  );

  const chosen = (strong.length ? strong : lines).join("\n");
  return chosen.slice(0, maxChars);
}

function inferQuizLadder(topic: string, transcript: string): string {
  const t = `${topic} ${transcript}`.toLowerCase();

  if (
    t.includes("place value") ||
    t.includes("ones") ||
    t.includes("tens") ||
    t.includes("hundreds") ||
    t.includes("expanded form")
  ) {
    return [
      "Q1-Q3: identify digits, values, or matching forms",
      "Q4-Q7: compare numbers, expanded form, and mixed place value facts",
      "Q8-Q10: solve slightly longer place value questions or pick the best matching form",
    ].join("\n");
  }

  if (
    t.includes("addition") ||
    t.includes("subtraction") ||
    t.includes("regroup")
  ) {
    return [
      "Q1-Q3: basic sums or differences",
      "Q4-Q7: two-digit problems and simple checking",
      "Q8-Q10: mixed word-style or regrouping-style questions",
    ].join("\n");
  }

  if (
    t.includes("multiplication") ||
    t.includes("array") ||
    t.includes("groups")
  ) {
    return [
      "Q1-Q3: recall basic facts",
      "Q4-Q7: equal groups and fact matching",
      "Q8-Q10: short solve-it or compare-it multiplication questions",
    ].join("\n");
  }

  if (
    t.includes("division") ||
    t.includes("quotient") ||
    t.includes("remainder")
  ) {
    return [
      "Q1-Q3: basic division facts",
      "Q4-Q7: equal groups and missing answer questions",
      "Q8-Q10: short solve-it or check-the-quotient questions",
    ].join("\n");
  }

  return [
    "Q1-Q3: easiest warm-up questions",
    "Q4-Q7: medium questions",
    "Q8-Q10: slightly harder Grade 4 questions",
  ].join("\n");
}

function gamifyExplanation(text: string, index: number): string {
  const cleaned = normalizeSpace(text);
  const base =
    cleaned.length > 0 ? cleaned : "Good thinking. Keep going step by step.";

  const prefixes = [
    "Nice start!",
    "Great job!",
    "Well done!",
    "Strong work!",
    "Awesome effort!",
  ];

  const prefix =
    index < 3
      ? prefixes[0]
      : index < 7
      ? prefixes[1 + ((index - 3) % 2)]
      : prefixes[3 + ((index - 7) % 2)];

  return `${prefix} ${base}`;
}

function extractKeyFacts(transcript: string, maxFacts: number = 8): string[] {
  const cleaned = (transcript ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[•●▪◦]/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  if (!cleaned) return [];

  const parts = cleaned
    .split(/[\n\.\?\!]/)
    .map((s) => normalizeSpace(s))
    .filter((s) => s.length >= 12 && s.length <= 140);

  const scored = parts.map((text, index) => {
    let score = 0;
    if (/\d/.test(text)) score += 4;
    if (
      /place value|ones|tens|hundreds|thousands|expanded form/i.test(text)
    )
      score += 4;
    if (/add|sum|subtract|difference|regroup/i.test(text)) score += 4;
    if (/multiply|times|groups|array/i.test(text)) score += 4;
    if (/divide|quotient|remainder|equal groups/i.test(text)) score += 4;
    if (/example|means|is|are|shows|represents|remember/i.test(text))
      score += 2;
    score += Math.max(0, 3 - Math.floor(index / 3));
    return { text, score };
  });

  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score)
    .map((x) => x.text)
    .filter((text) => {
      const key = text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxFacts);
}

function formatKeyFactsForPrompt(facts: string[]): string {
  if (!facts.length) return "- No key facts found.";
  return facts.map((fact, index) => `- Fact ${index + 1}: ${fact}`).join("\n");
}

function isStrongFlashcard(card: GeneratedFlashcard): boolean {
  const front = normalizeSpace(card.front);
  const back = normalizeSpace(card.back);
  const topic = normalizeSpace(card.topic || "General");

  if (front.length < 8 || back.length < 2) return false;
  if (front.length > 90 || back.length > 120) return false;

  const weakFronts = [
    /^what do you need to remember\??$/i,
    /^what steps should you follow\??$/i,
    /^what do you learn/i,
    /^what should you do first/i,
    /^how can you check your answer/i,
    /^what is a good math habit/i,
    /^why is place value or operation order important/i,
    /^what math idea does this teach\??$/i,
    /^practice this\??$/i,
    /^remember this\??$/i,
  ];

  if (weakFronts.some((r) => r.test(front))) return false;

  if (new Set([front.toLowerCase(), back.toLowerCase()]).size < 2) return false;
  if (!topic) return false;

  return true;
}

function dedupeStrings(options: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const option of options) {
    const clean = normalizeSpace(option);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }

  return out;
}

function extractAllNumbers(text: string): number[] {
  const matches = text.match(/\b\d+\b/g) ?? [];
  return [...new Set(matches.map(Number).filter((n) => Number.isFinite(n)))];
}

/* ============================== QUIZ / FLASHCARD PROMPTS ============================== */

function buildQuizPrompt(
  lessonTitle: string,
  topic: string,
  transcript: string,
  keyFacts: string[],
  difficultyHints: string
) {
  return `
Create exactly ${QUIZ_COUNT} multiple choice quiz questions for Grade 4.

Lesson: ${lessonTitle}
Topic: ${topic}

Lesson notes:
${transcript}

Key facts:
${formatKeyFactsForPrompt(keyFacts)}

Difficulty ladder:
${difficultyHints}

Rules:
- Use simple Grade 4 language
- Exactly 10 questions
- Each question must have 4 different options
- Only one correct answer
- The correct answer must exactly match one option
- Keep questions clear and fair
- Prefer math and lesson understanding
- Make the difficulty rise slowly
- Keep explanations short and helpful
- No markdown tables
- No extra commentary before or after

Return exactly in this format:

Q1: question
A) option
B) option
C) option
D) option
ANS: exact option text
WHY: short explanation

Q2: question
A) option
B) option
C) option
D) option
ANS: exact option text
WHY: short explanation

Continue until Q10.
`.trim();
}

function buildFlashcardPrompt(
  unitTitle: string,
  transcript: string,
  keyFacts: string[]
) {
  return `
Create exactly ${FLASHCARD_COUNT} high-quality flashcards for Grade 4 revision.

Unit: ${unitTitle}

Lesson notes:
${transcript}

Key facts:
${formatKeyFactsForPrompt(keyFacts)}

Goal:
Make flashcards that feel specific, useful, and easy to study from.

Rules:
- Exactly 10 flashcards
- Each flashcard must be based on a real lesson fact
- Front = one clear question
- Back = one clear answer
- No vague cards
- No generic study advice
- No duplicate cards
- Prefer these types of cards:
  1. definition cards
  2. place value cards
  3. expanded form cards
  4. arithmetic fact cards
  5. short method/step cards
- Use simple Grade 4 language
- Keep fronts under 60 characters when possible
- Keep backs under 90 characters when possible
- No extra commentary

Return exactly in this format:

F1: front text
B1: back text
T1: topic

F2: front text
B2: back text
T2: topic

Continue until F10.
`.trim();
}

/* ============================== LOCAL QUIZ BUILDERS ============================== */

function buildLogicQuizFromFacts(
  facts: string[],
  topic: string
): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  const used = new Set<string>();
  let id = Date.now() + 5000;

  const push = (
    question: string,
    options: string[],
    correctAnswer: string,
    explanation: string
  ) => {
    const cleanQuestion = normalizeSpace(question);
    const dedupedOptions = dedupeStrings(options).slice(0, 4);
    const cleanCorrect = normalizeSpace(correctAnswer);

    const key = cleanQuestion.toLowerCase();
    if (!cleanQuestion || used.has(key)) return;
    if (dedupedOptions.length !== 4) return;
    if (
      !dedupedOptions.some(
        (opt) => opt.toLowerCase() === cleanCorrect.toLowerCase()
      )
    ) {
      return;
    }

    used.add(key);
    out.push(
      makeQ(
        ++id,
        topic,
        cleanQuestion,
        dedupedOptions,
        cleanCorrect,
        explanation
      )
    );
  };

  for (const fact of facts) {
    if (out.length >= 6) break;

    const valueMatch = fact.match(/value of (\d) in (\d+)/i);
    if (valueMatch) {
      const digit = Number(valueMatch[1]);
      const number = valueMatch[2];
      const idx = number.indexOf(String(digit));

      if (idx >= 0) {
        const value = digit * Math.pow(10, number.length - idx - 1);
        push(
          `What is the value of ${digit} in ${number}?`,
          [String(value), String(digit), String(value * 10), String(number)],
          String(value),
          `That digit is worth ${value}.`
        );
        continue;
      }
    }

    const expanded = fact.match(
      /(\d[\d,]*)\s*(?:=|is)\s*([\d,]+\s*\+\s*[\d,]+(?:\s*\+\s*[\d,]+)*)/i
    );
    if (expanded) {
      const number = normalizeSpace(expanded[1]);
      const form = normalizeSpace(expanded[2]);
      push(
        `Which expanded form matches ${number}?`,
        [form, number, form.replace(/\+/g, "-"), form.replace(/\d+/g, "0")],
        form,
        `Match the hundreds, tens, and ones carefully.`
      );
      continue;
    }
  }

  for (const fact of facts) {
    if (out.length >= 8) break;

    const add = fact.match(/(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/);
    if (add) {
      const a = Number(add[1]);
      const b = Number(add[2]);
      const c = Number(add[3]);
      push(
        `What is ${a} + ${b}?`,
        [
          String(c),
          String(c + 10),
          String(Math.max(0, c - 10)),
          String(c + 1),
        ],
        String(c),
        `Add the numbers carefully.`
      );
      continue;
    }

    const sub = fact.match(/(\d+)\s*-\s*(\d+)\s*=\s*(\d+)/);
    if (sub) {
      const a = Number(sub[1]);
      const b = Number(sub[2]);
      const c = Number(sub[3]);
      push(
        `What is ${a} - ${b}?`,
        [
          String(c),
          String(c + 10),
          String(Math.max(0, c - 10)),
          String(c + 1),
        ],
        String(c),
        `Subtract step by step.`
      );
      continue;
    }

    const mul = fact.match(/(\d+)\s*[x×]\s*(\d+)\s*=\s*(\d+)/i);
    if (mul) {
      const a = Number(mul[1]);
      const b = Number(mul[2]);
      const c = Number(mul[3]);
      push(
        `What is ${a} × ${b}?`,
        [
          String(c),
          String(c + a),
          String(Math.max(0, c - a)),
          String(c + 1),
        ],
        String(c),
        `Think of equal groups.`
      );
      continue;
    }

    const div = fact.match(/(\d+)\s*[÷/]\s*(\d+)\s*=\s*(\d+)/i);
    if (div) {
      const a = Number(div[1]);
      const b = Number(div[2]);
      const c = Number(div[3]);
      push(
        `What is ${a} ÷ ${b}?`,
        [String(c), String(c + 1), String(Math.max(0, c - 1)), String(b)],
        String(c),
        `Share equally to divide.`
      );
      continue;
    }

    const definition = fact.match(/^(.{3,45}?) is (.+)$/i);
    if (definition) {
      const label = normalizeSpace(definition[1]);
      const answer = normalizeSpace(definition[2]).replace(/\.$/, "");

      if (answer.length <= 60) {
        push(
          `Which answer best matches ${label}?`,
          [
            answer,
            `${label} is a number sentence`,
            `It means guessing`,
            `It is not used in math`,
          ],
          answer,
          `That matches the lesson fact.`
        );
      }
    }
  }

  return out.filter(isValidGeneratedQuestion).slice(0, 8);
}

function buildQuickQuizFromNumbers(
  transcript: string,
  topic: string
): GeneratedQuestion[] {
  const nums = extractAllNumbers(transcript);
  const out: GeneratedQuestion[] = [];
  let base = Date.now() + 9000;

  const addQ = (
    question: string,
    options: string[],
    correct: string,
    explanation: string
  ) => {
    const q = makeQ(++base, topic, question, options, correct, explanation);
    if (isValidGeneratedQuestion(q)) out.push(q);
  };

  for (let i = 0; i + 1 < nums.length && out.length < 4; i += 2) {
    const a = nums[i];
    const b = nums[i + 1];

    if (a <= 100 && b <= 100) {
      const sum = a + b;
      addQ(
        `What is ${a} + ${b}?`,
        dedupeStrings([
          String(sum),
          String(sum + 1),
          String(Math.max(0, sum - 1)),
          String(sum + 2),
        ]),
        String(sum),
        `Add ${a} and ${b}.`
      );

      if (a >= b && out.length < 4) {
        const diff = a - b;
        addQ(
          `What is ${a} - ${b}?`,
          dedupeStrings([
            String(diff),
            String(diff + 1),
            String(Math.max(0, diff - 1)),
            String(diff + 2),
          ]),
          String(diff),
          `Subtract ${b} from ${a}.`
        );
      }
    }
  }

  return dedupeQuestions(out).slice(0, 4);
}

/* ============================== QUIZ GENERATION ============================== */

export async function generateQuizFromTranscript(
  transcript: string,
  lessonTitle: string,
  topic: string
): Promise<GeneratedQuestion[]> {
  const cacheKey = `${lessonTitle}|||${topic}|||${pickRelevantTranscript(
    transcript,
    500
  )}`;
  const cached = quizCache.get(cacheKey);
  if (cached) return cached;

  const compactTranscript = pickRelevantTranscript(transcript, 700);
  const keyFacts = extractKeyFacts(compactTranscript, 8);
  const difficultyHints = inferQuizLadder(topic, compactTranscript);

  console.log("Quiz generation mode");
  console.log("Lesson:", lessonTitle);
  console.log("Topic:", topic);

  let modelQuiz: GeneratedQuestion[] = [];

  try {
    const engine = await getContext(STUDY_MODEL);

    const prompt = formatPromptForModel(
      STUDY_MODEL,
      [
        {
          id: "quiz-user",
          role: "user",
          content: buildQuizPrompt(
            lessonTitle,
            topic,
            compactTranscript,
            keyFacts,
            difficultyHints
          ),
        },
      ],
      QUIZ_SYSTEM_PROMPT
    );

    const raw = await runCompletion(engine, prompt, {
      n_predict: QUIZ_N_PREDICT,
      temperature: QUIZ_TEMPERATURE,
      top_p: 0.85,
      top_k: 25,
    });

    modelQuiz = parseQuizResponse(raw, lessonTitle, topic);
  } catch (e) {
    console.log("Quiz model generation failed, using fallback path:", e);
  } finally {
    await releaseLoadedContext();
  }

  const logicQuiz = buildLogicQuizFromFacts(keyFacts, topic);
  const quickQuiz = buildQuickQuizFromNumbers(compactTranscript, topic);

  const merged = dedupeQuestions([...modelQuiz, ...logicQuiz, ...quickQuiz]);
  const finalQuiz = fillQuizWithFallbacks(merged, topic).slice(0, QUIZ_COUNT);

  quizCache.set(cacheKey, finalQuiz);
  return finalQuiz;
}

/* ============================== FLASHCARD HELPERS ============================== */

function dedupeFlashcards(items: GeneratedFlashcard[]): GeneratedFlashcard[] {
  const seen = new Set<string>();
  const out: GeneratedFlashcard[] = [];

  for (const item of items) {
    const key = `${normalizeSpace(item.front).toLowerCase()}|||${normalizeSpace(
      item.back
    ).toLowerCase()}`;

    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      ...item,
      front: normalizeSpace(item.front),
      back: normalizeSpace(item.back),
      topic: normalizeSpace(item.topic || "General"),
    });
  }

  return out;
}

function parseFlashcardResponse(
  response: string,
  unitTitle: string
): GeneratedFlashcard[] {
  const txt = (response ?? "").replace(/\r\n/g, "\n").trim();
  if (!txt) return [];

  const out: GeneratedFlashcard[] = [];

  for (let i = 1; i <= FLASHCARD_COUNT; i++) {
    const front = txt.match(new RegExp(`^F${i}:\\s*(.+)$`, "m"))?.[1]?.trim();
    const back = txt.match(new RegExp(`^B${i}:\\s*(.+)$`, "m"))?.[1]?.trim();
    const topic = txt.match(new RegExp(`^T${i}:\\s*(.+)$`, "m"))?.[1]?.trim();

    if (!front || !back) continue;

    out.push({
      id: i,
      front: normalizeSpace(front),
      back: normalizeSpace(back),
      topic: normalizeSpace(topic || unitTitle),
    });
  }

  return dedupeFlashcards(out)
    .filter(isStrongFlashcard)
    .slice(0, FLASHCARD_COUNT)
    .map((card, index) => ({ ...card, id: index + 1 }));
}

function makeFlashcardFrontFromSentence(
  sentence: string,
  unitTitle: string
): string {
  const s = normalizeSpace(sentence);

  const valueMatch = s.match(/value of (\d) in (\d+)/i);
  if (valueMatch) {
    return `What is the value of ${valueMatch[1]} in ${valueMatch[2]}?`;
  }

  const expandedMatch = s.match(
    /(\d[\d,]*)\s*(?:=|is)\s*([\d,]+\s*\+\s*[\d,]+(?:\s*\+\s*[\d,]+)*)/i
  );
  if (expandedMatch) {
    return `Expanded form of ${normalizeSpace(expandedMatch[1])}?`;
  }

  const addMatch = s.match(/(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/);
  if (addMatch) {
    return `What is ${addMatch[1]} + ${addMatch[2]}?`;
  }

  const subMatch = s.match(/(\d+)\s*-\s*(\d+)\s*=\s*(\d+)/);
  if (subMatch) {
    return `What is ${subMatch[1]} - ${subMatch[2]}?`;
  }

  const mulMatch = s.match(/(\d+)\s*[x×]\s*(\d+)\s*=\s*(\d+)/i);
  if (mulMatch) {
    return `What is ${mulMatch[1]} × ${mulMatch[2]}?`;
  }

  const divMatch = s.match(/(\d+)\s*[÷/]\s*(\d+)\s*=\s*(\d+)/i);
  if (divMatch) {
    return `What is ${divMatch[1]} ÷ ${divMatch[2]}?`;
  }

  const defMatch = s.match(/^(.{3,40}?) is (.+)$/i);
  if (defMatch) {
    return `What is ${normalizeSpace(defMatch[1])}?`;
  }

  const meansMatch = s.match(/^(.{3,40}?) means (.+)$/i);
  if (meansMatch) {
    return `What does ${normalizeSpace(meansMatch[1])} mean?`;
  }

  const representMatch = s.match(/^(.{3,40}?) represents (.+)$/i);
  if (representMatch) {
    return `What does ${normalizeSpace(representMatch[1])} represent?`;
  }

  return "";
}

function buildLogicFlashcardsFromFacts(
  facts: string[],
  unitTitle: string
): GeneratedFlashcard[] {
  const out: GeneratedFlashcard[] = [];
  const used = new Set<string>();

  const push = (front: string, back: string, topic: string = unitTitle) => {
    const cleanFront = normalizeSpace(front);
    const cleanBack = normalizeSpace(back);
    const cleanTopic = normalizeSpace(topic || unitTitle);

    if (!cleanFront || !cleanBack) return;

    const card: GeneratedFlashcard = {
      id: out.length + 1,
      front: cleanFront,
      back: cleanBack,
      topic: cleanTopic,
    };

    const key = `${cleanFront.toLowerCase()}|||${cleanBack.toLowerCase()}`;
    if (used.has(key) || !isStrongFlashcard(card)) return;

    used.add(key);
    out.push(card);
  };

  for (const fact of facts) {
    if (out.length >= FLASHCARD_COUNT) break;

    const valueMatch = fact.match(/value of (\d) in (\d+)/i);
    if (valueMatch) {
      const digit = Number(valueMatch[1]);
      const number = valueMatch[2];
      const idx = number.indexOf(String(digit));
      if (idx >= 0) {
        const value = digit * Math.pow(10, number.length - idx - 1);
        push(
          `What is the value of ${digit} in ${number}?`,
          String(value),
          "Place Value"
        );
        continue;
      }
    }

    const expanded = fact.match(
      /(\d[\d,]*)\s*(?:=|is)\s*([\d,]+\s*\+\s*[\d,]+(?:\s*\+\s*[\d,]+)*)/i
    );
    if (expanded) {
      push(
        `Expanded form of ${normalizeSpace(expanded[1])}?`,
        normalizeSpace(expanded[2]),
        "Expanded Form"
      );
      continue;
    }

    const add = fact.match(/(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/);
    if (add) {
      push(`What is ${add[1]} + ${add[2]}?`, add[3], "Addition");
      continue;
    }

    const sub = fact.match(/(\d+)\s*-\s*(\d+)\s*=\s*(\d+)/);
    if (sub) {
      push(`What is ${sub[1]} - ${sub[2]}?`, sub[3], "Subtraction");
      continue;
    }

    const mul = fact.match(/(\d+)\s*[x×]\s*(\d+)\s*=\s*(\d+)/i);
    if (mul) {
      push(`What is ${mul[1]} × ${mul[2]}?`, mul[3], "Multiplication");
      continue;
    }

    const div = fact.match(/(\d+)\s*[÷/]\s*(\d+)\s*=\s*(\d+)/i);
    if (div) {
      push(`What is ${div[1]} ÷ ${div[2]}?`, div[3], "Division");
      continue;
    }

    const definition = fact.match(/^(.{3,40}?) is (.+)$/i);
    if (definition) {
      const label = normalizeSpace(definition[1]);
      const answer = normalizeSpace(definition[2]).replace(/\.$/, "");
      if (answer.length <= 80) {
        push(`What is ${label}?`, answer, unitTitle);
        continue;
      }
    }

    const front = makeFlashcardFrontFromSentence(fact, unitTitle);
    if (front) {
      push(front, fact, unitTitle);
    }
  }

  return out.slice(0, FLASHCARD_COUNT);
}

function buildFlashcardFallback(
  transcript: string,
  unitTitle: string
): GeneratedFlashcard[] {
  const cleaned = (transcript ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const sentences = cleaned
    .split(/[.\n]/)
    .map((s) => normalizeSpace(s))
    .filter(
      (s) =>
        s.length >= 12 &&
        s.length <= 100 &&
        !s.startsWith("-") &&
        !/^(welcome|hi|hey|hello)/i.test(s)
    );

  const cards: GeneratedFlashcard[] = [];

  for (const sentence of sentences) {
    if (cards.length >= FLASHCARD_COUNT) break;

    const front = makeFlashcardFrontFromSentence(sentence, unitTitle);
    if (!front) continue;

    const card: GeneratedFlashcard = {
      id: cards.length + 1,
      front,
      back: sentence,
      topic: unitTitle,
    };

    if (isStrongFlashcard(card)) {
      cards.push(card);
    }
  }

  return dedupeFlashcards(cards)
    .filter(isStrongFlashcard)
    .slice(0, FLASHCARD_COUNT)
    .map((card, index) => ({ ...card, id: index + 1 }));
}

function buildQuickFlashcardsFromNumbers(
  transcript: string,
  unitTitle: string
): GeneratedFlashcard[] {
  const nums = extractAllNumbers(transcript);
  const out: GeneratedFlashcard[] = [];

  for (let i = 0; i + 1 < nums.length && out.length < 4; i += 2) {
    const a = nums[i];
    const b = nums[i + 1];

    if (a <= 100 && b <= 100) {
      out.push({
        id: out.length + 1,
        front: `What is ${a} + ${b}?`,
        back: String(a + b),
        topic: unitTitle,
      });

      if (a >= b && out.length < 4) {
        out.push({
          id: out.length + 1,
          front: `What is ${a} - ${b}?`,
          back: String(a - b),
          topic: unitTitle,
        });
      }
    }
  }

  return dedupeFlashcards(out).filter(isStrongFlashcard).slice(0, 4);
}

/* ============================== FLASHCARD GENERATION ============================== */

export async function generateFlashcardsFromTranscript(
  transcript: string,
  unitTitle: string
): Promise<GeneratedFlashcard[]> {
  const cacheKey = `${unitTitle}|||${pickRelevantTranscript(transcript, 500)}`;
  const cached = flashcardCache.get(cacheKey);
  if (cached) return cached;

  const compactTranscript = pickRelevantTranscript(transcript, 550);
  const keyFacts = extractKeyFacts(compactTranscript, 8);

  console.log("Flashcard generation mode");
  console.log("Unit:", unitTitle);

  let modelCards: GeneratedFlashcard[] = [];

  try {
    const engine = await getContext(STUDY_MODEL);

    const prompt = formatPromptForModel(
      STUDY_MODEL,
      [
        {
          id: "flashcard-user",
          role: "user",
          content: buildFlashcardPrompt(unitTitle, compactTranscript, keyFacts),
        },
      ],
      FLASHCARD_SYSTEM_PROMPT
    );

    const raw = await runCompletion(engine, prompt, {
      n_predict: FLASHCARD_N_PREDICT,
      temperature: FLASHCARD_TEMPERATURE,
      top_p: 0.82,
      top_k: 20,
    });

    modelCards = parseFlashcardResponse(raw, unitTitle);
  } catch (e) {
    console.log("Flashcard model generation failed, using fallback path:", e);
  } finally {
    await releaseLoadedContext();
  }

  const logicCards = buildLogicFlashcardsFromFacts(keyFacts, unitTitle);
  const quickCards = buildQuickFlashcardsFromNumbers(
    compactTranscript,
    unitTitle
  );
  const fallback = buildFlashcardFallback(compactTranscript, unitTitle);

  const merged = dedupeFlashcards([
    ...logicCards,
    ...modelCards,
    ...quickCards,
    ...fallback,
  ])
    .filter(isStrongFlashcard)
    .slice(0, FLASHCARD_COUNT)
    .map((card, index) => ({ ...card, id: index + 1 }));

  flashcardCache.set(cacheKey, merged);
  return merged;
}

/* ============================== QUIZ PARSER ============================== */

function parseQuizResponse(
  response: string,
  _lessonTitle: string,
  topic: string
): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  const txt = (response ?? "").replace(/\r\n/g, "\n").trim();
  if (!txt) return out;

  const blocks = txt
    .split(/\n(?=Q\d+:\s*)/g)
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

    const options = [A, B, C, D].map(normalizeSpace);

    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) continue;

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
      question: normalizeSpace(q),
      options,
      correctAnswer: normalizeSpace(correct),
      topic,
      explanation:
        why && why.length
          ? normalizeSpace(why)
          : "Good job! Keep practicing!",
    });
  }

  return out.slice(0, QUIZ_COUNT);
}

/* ============================== QUIZ FIXERS ============================== */

function parseNumberFromOption(option: string): number | null {
  const clean = option.replace(/,/g, "");
  const m = clean.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function findOptionMatchingNumber(
  options: string[],
  value: number
): string | null {
  for (const opt of options) {
    const n = parseNumberFromOption(opt);
    if (n === value) return opt;
  }
  return null;
}

function computeSimpleArithmetic(question: string): number | null {
  const q = question.replace(/,/g, "").trim();

  const mul = q.match(/(\d+)\s*[×x*]\s*(\d+)/i);
  if (mul) return Number(mul[1]) * Number(mul[2]);

  const div = q.match(/(\d+)\s*[÷/]\s*(\d+)/i);
  if (div) {
    const a = Number(div[1]);
    const b = Number(div[2]);
    if (b === 0) return null;
    return a / b;
  }

  const add = q.match(/(\d+)\s*\+\s*(\d+)/i);
  if (add) return Number(add[1]) + Number(add[2]);

  const sub = q.match(/(\d+)\s*-\s*(\d+)/i);
  if (sub) return Number(sub[1]) - Number(sub[2]);

  return null;
}

function computePlaceValueAnswer(question: string): string | null {
  const q = normalizeSpace(question.toLowerCase());

  const valueMatch = q.match(/value of (\d) in (\d+)/i);
  if (!valueMatch) return null;

  const digit = valueMatch[1];
  const numStr = valueMatch[2];
  const idx = numStr.indexOf(digit);

  if (idx === -1) return null;

  const power = numStr.length - idx - 1;
  const value = Number(digit) * Math.pow(10, power);

  return String(value);
}

function fixQuestionMath(q: GeneratedQuestion): GeneratedQuestion {
  const question = normalizeSpace(q.question);
  const options = [...q.options];
  let correctAnswer = q.correctAnswer;
  let explanation = q.explanation;

  const arithmeticAnswer = computeSimpleArithmetic(question);
  if (arithmeticAnswer !== null) {
    const matched = findOptionMatchingNumber(options, arithmeticAnswer);
    if (matched) {
      correctAnswer = matched;
      explanation = `The answer is ${arithmeticAnswer}.`;
      return { ...q, correctAnswer, explanation };
    }
  }

  const placeValueAnswer = computePlaceValueAnswer(question);
  if (placeValueAnswer !== null) {
    const matched =
      options.find(
        (opt) =>
          normalizeSpace(opt).toLowerCase() ===
          placeValueAnswer.toLowerCase()
      ) ||
      options.find((opt) => normalizeSpace(opt).includes(placeValueAnswer));

    if (matched) {
      correctAnswer = matched;
      explanation = `That digit has a value of ${placeValueAnswer}.`;
      return { ...q, correctAnswer, explanation };
    }
  }

  return q;
}

function isValidGeneratedQuestion(q: GeneratedQuestion): boolean {
  if (!q.question || !q.correctAnswer || !q.explanation) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;

  const normalizedOptions = q.options.map((o) =>
    normalizeSpace(o).toLowerCase()
  );

  if (normalizedOptions.some((o) => !o)) return false;
  if (new Set(normalizedOptions).size !== 4) return false;

  return normalizedOptions.includes(
    normalizeSpace(q.correctAnswer).toLowerCase()
  );
}

function dedupeQuestions(items: GeneratedQuestion[]): GeneratedQuestion[] {
  const seen = new Set<string>();
  const out: GeneratedQuestion[] = [];

  for (const item of items) {
    const key = normalizeSpace(item.question).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function postProcessGeneratedQuestions(
  items: GeneratedQuestion[],
  topic: string
): GeneratedQuestion[] {
  return dedupeQuestions(
    items
      .map((q, index) =>
        fixQuestionMath({
          ...q,
          topic,
          question: normalizeSpace(q.question),
          options: q.options.map((o) => normalizeSpace(o)),
          correctAnswer: normalizeSpace(q.correctAnswer),
          explanation: gamifyExplanation(
            q.explanation || "Keep practicing. You can do this.",
            index
          ),
        })
      )
      .filter(isValidGeneratedQuestion)
  );
}

/* ============================== FALLBACK QUIZ ============================== */

function makeQ(
  id: number,
  topic: string,
  question: string,
  options: string[],
  correctAnswer: string,
  explanation: string
): GeneratedQuestion {
  return {
    id,
    topic,
    question,
    options,
    correctAnswer,
    explanation: gamifyExplanation(explanation, id % 10),
  };
}

function getPlaceValueFallback(topic: string): GeneratedQuestion[] {
  const base = Date.now();
  return [
    makeQ(
      base + 1,
      topic,
      "What is the value of 5 in 254?",
      ["5", "50", "500", "25"],
      "50",
      "The 5 is in the tens place."
    ),
    makeQ(
      base + 2,
      topic,
      "Which number has 4 tens and 7 ones?",
      ["47", "74", "407", "470"],
      "47",
      "4 tens and 7 ones make 47."
    ),
    makeQ(
      base + 3,
      topic,
      "What is the value of 3 in 325?",
      ["3", "30", "300", "35"],
      "300",
      "The 3 is in the hundreds place."
    ),
    makeQ(
      base + 4,
      topic,
      "Which expanded form matches 423?",
      ["400 + 20 + 3", "40 + 20 + 3", "4 + 2 + 3", "400 + 2 + 3"],
      "400 + 20 + 3",
      "423 has 4 hundreds, 2 tens, 3 ones."
    ),
    makeQ(
      base + 5,
      topic,
      "What is the value of 7 in 172?",
      ["7", "70", "700", "17"],
      "70",
      "The 7 is in the tens place."
    ),
    makeQ(
      base + 6,
      topic,
      "Which number is 6 hundreds, 1 ten, and 2 ones?",
      ["612", "621", "162", "602"],
      "612",
      "600 + 10 + 2 = 612."
    ),
    makeQ(
      base + 7,
      topic,
      "Which digit is in the ones place in 583?",
      ["5", "8", "3", "58"],
      "3",
      "The ones place is the last digit."
    ),
    makeQ(
      base + 8,
      topic,
      "What is the value of 8 in 480?",
      ["8", "80", "800", "480"],
      "80",
      "The 8 is in the tens place."
    ),
    makeQ(
      base + 9,
      topic,
      "Which number is written as 300 + 40 + 6?",
      ["346", "364", "436", "306"],
      "346",
      "300 + 40 + 6 = 346."
    ),
    makeQ(
      base + 10,
      topic,
      "Which number is greater?",
      ["34", "43", "They are equal", "Cannot tell"],
      "43",
      "43 has more tens."
    ),
  ];
}

function getAdditionSubtractionFallback(topic: string): GeneratedQuestion[] {
  const base = Date.now() + 1000;
  return [
    makeQ(base + 1, topic, "What is 36 + 24?", ["50", "60", "62", "72"], "60", "36 + 24 = 60."),
    makeQ(base + 2, topic, "What is 75 - 18?", ["57", "67", "63", "56"], "57", "75 - 18 = 57."),
    makeQ(base + 3, topic, "What is 48 + 12?", ["50", "60", "70", "58"], "60", "48 + 12 = 60."),
    makeQ(base + 4, topic, "What is 90 - 25?", ["75", "65", "55", "60"], "65", "90 - 25 = 65."),
    makeQ(base + 5, topic, "Which sum is correct?", ["23 + 14 = 37", "23 + 14 = 36", "23 + 14 = 35", "23 + 14 = 38"], "23 + 14 = 37", "23 plus 14 equals 37."),
    makeQ(base + 6, topic, "Which difference is correct?", ["54 - 21 = 33", "54 - 21 = 23", "54 - 21 = 43", "54 - 21 = 31"], "54 - 21 = 33", "54 minus 21 equals 33."),
    makeQ(base + 7, topic, "What is 67 + 5?", ["71", "72", "73", "74"], "72", "67 + 5 = 72."),
    makeQ(base + 8, topic, "What is 100 - 46?", ["54", "64", "44", "56"], "54", "100 - 46 = 54."),
    makeQ(base + 9, topic, "What is 29 + 30?", ["49", "59", "69", "39"], "59", "29 + 30 = 59."),
    makeQ(base + 10, topic, "What is 81 - 9?", ["71", "72", "73", "74"], "72", "81 - 9 = 72."),
  ];
}

function getMultiplicationFallback(topic: string): GeneratedQuestion[] {
  const base = Date.now() + 2000;
  return [
    makeQ(base + 1, topic, "What is 4 × 3?", ["7", "12", "8", "16"], "12", "4 groups of 3 is 12."),
    makeQ(base + 2, topic, "What is 6 × 5?", ["30", "25", "35", "20"], "30", "6 times 5 is 30."),
    makeQ(base + 3, topic, "What is 7 × 2?", ["14", "12", "16", "10"], "14", "7 times 2 is 14."),
    makeQ(base + 4, topic, "What is 9 × 3?", ["18", "21", "27", "24"], "27", "9 times 3 is 27."),
    makeQ(base + 5, topic, "What is 8 × 4?", ["28", "30", "32", "36"], "32", "8 times 4 is 32."),
    makeQ(base + 6, topic, "Which multiplication fact is correct?", ["5 × 4 = 20", "5 × 4 = 15", "5 × 4 = 25", "5 × 4 = 10"], "5 × 4 = 20", "5 groups of 4 is 20."),
    makeQ(base + 7, topic, "What is 3 × 10?", ["13", "30", "20", "40"], "30", "3 times 10 is 30."),
    makeQ(base + 8, topic, "What is 2 × 9?", ["18", "16", "20", "12"], "18", "2 times 9 is 18."),
    makeQ(base + 9, topic, "What is 7 × 7?", ["42", "48", "49", "56"], "49", "7 times 7 is 49."),
    makeQ(base + 10, topic, "What is 5 × 8?", ["35", "40", "45", "30"], "40", "5 times 8 is 40."),
  ];
}

function getDivisionFallback(topic: string): GeneratedQuestion[] {
  const base = Date.now() + 3000;
  return [
    makeQ(base + 1, topic, "What is 12 ÷ 3?", ["2", "3", "4", "6"], "4", "12 split into 3 equal groups is 4."),
    makeQ(base + 2, topic, "What is 20 ÷ 5?", ["2", "4", "5", "10"], "4", "20 divided by 5 is 4."),
    makeQ(base + 3, topic, "What is 18 ÷ 2?", ["8", "9", "6", "7"], "9", "18 divided by 2 is 9."),
    makeQ(base + 4, topic, "What is 24 ÷ 6?", ["3", "4", "5", "6"], "4", "24 divided by 6 is 4."),
    makeQ(base + 5, topic, "What is 16 ÷ 4?", ["2", "4", "6", "8"], "4", "16 divided by 4 is 4."),
    makeQ(base + 6, topic, "Which division fact is correct?", ["15 ÷ 3 = 5", "15 ÷ 3 = 4", "15 ÷ 3 = 6", "15 ÷ 3 = 3"], "15 ÷ 3 = 5", "15 divided by 3 is 5."),
    makeQ(base + 7, topic, "What is 30 ÷ 5?", ["5", "6", "7", "8"], "6", "30 divided by 5 is 6."),
    makeQ(base + 8, topic, "What is 21 ÷ 7?", ["2", "3", "4", "5"], "3", "21 divided by 7 is 3."),
    makeQ(base + 9, topic, "What is 27 ÷ 9?", ["2", "3", "4", "5"], "3", "27 divided by 9 is 3."),
    makeQ(base + 10, topic, "What is 14 ÷ 7?", ["1", "2", "3", "4"], "2", "14 divided by 7 is 2."),
  ];
}

function getGenericFallback(topic: string): GeneratedQuestion[] {
  return [
    ...getPlaceValueFallback(topic).slice(0, 3),
    ...getAdditionSubtractionFallback(topic).slice(0, 3),
    ...getMultiplicationFallback(topic).slice(0, 2),
    ...getDivisionFallback(topic).slice(0, 2),
  ];
}

function getFallbackQuizForTopic(topic: string): GeneratedQuestion[] {
  const t = (topic || "").toLowerCase();

  if (
    t.includes("place value") ||
    t.includes("ones and tens") ||
    t.includes("hundreds") ||
    t.includes("expanded form")
  ) {
    return getPlaceValueFallback(topic);
  }

  if (
    t.includes("addition") ||
    t.includes("subtraction") ||
    t.includes("regroup") ||
    t.includes("regrouping")
  ) {
    return getAdditionSubtractionFallback(topic);
  }

  if (
    t.includes("multiplication") ||
    t.includes("multiply") ||
    t.includes("partial product") ||
    t.includes("array")
  ) {
    return getMultiplicationFallback(topic);
  }

  if (
    t.includes("division") ||
    t.includes("divide") ||
    t.includes("quotient") ||
    t.includes("remainder") ||
    t.includes("equal groups")
  ) {
    return getDivisionFallback(topic);
  }

  return getGenericFallback(topic);
}

function fillQuizWithFallbacks(
  items: GeneratedQuestion[],
  topic: string
): GeneratedQuestion[] {
  const clean = postProcessGeneratedQuestions(items, topic);
  if (clean.length >= QUIZ_COUNT) return clean.slice(0, QUIZ_COUNT);

  const fallback = getFallbackQuizForTopic(topic);
  const combined = [...clean];
  const seen = new Set(
    combined.map((q) => normalizeSpace(q.question).toLowerCase())
  );

  for (const q of fallback) {
    const key = normalizeSpace(q.question).toLowerCase();
    if (seen.has(key)) continue;
    combined.push(q);
    seen.add(key);
    if (combined.length >= QUIZ_COUNT) break;
  }

  return combined.slice(0, QUIZ_COUNT);
}

/* ============================== CHAT ============================== */

function isGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["hi", "hello", "hey", "hii", "sup"].some(
    (g) => t === g || t.startsWith(g + " ")
  );
}

async function generateDirectChat(
  engine: LlamaContext,
  recentHistory: Message[]
): Promise<string> {
  const prompt = formatPromptForModel(
    CHAT_MODEL,
    recentHistory,
    DEFAULT_SYSTEM_PROMPT
  );

  return runCompletion(engine, prompt, {
    n_predict: CHAT_N_PREDICT,
    temperature: CHAT_TEMPERATURE,
    top_p: 0.9,
    top_k: 40,
  });
}

export async function callAI(history: Message[]): Promise<Message> {
  if (aiState === "downloading") {
    const pct = aiProgress ? `${aiProgress.percent.toFixed(1)}%` : "";
    return {
      id: "dl",
      role: "assistant",
      content: `Preparing AI… ${pct}`.trim(),
    };
  }

  if (aiState === "loading") {
    return {
      id: "ld",
      role: "assistant",
      content: "Loading AI… Almost ready!",
    };
  }

  if (aiState === "error") {
    return {
      id: "err",
      role: "assistant",
      content: aiError || "AI Error",
    };
  }

  const lastUser = [...history].reverse().find((m) => m.role === "user");

  if (!lastUser) {
    return {
      id: "empty",
      role: "assistant",
      content: "Hi! Ask me anything and I will help you learn 😊",
    };
  }

  if (isGreeting(lastUser.content)) {
    return {
      id: "greet",
      role: "assistant",
      content:
        "Hi! I’m your Offklass Buddy. Ask me any question and I’ll help in a simple way 😊",
    };
  }

  const fallback = tryMathFallback(lastUser.content);
  if (fallback) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: fallback,
    };
  }

  inflight = (async () => {
    try {
      const engine = await getContext(CHAT_MODEL);
      const startTime = Date.now();

      const recentHistory = history.slice(-6);
      const cleaned = await generateDirectChat(engine, recentHistory);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log("AI response completed in:", responseTime, "ms");

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

/* ============================== PRELOAD HELPERS ============================== */

export function clearGeneratedStudyCaches() {
  quizCache.clear();
  flashcardCache.clear();
}

export function getGeneratedStudyCacheInfo() {
  return {
    quizEntries: quizCache.size,
    flashcardEntries: flashcardCache.size,
  };
}

/* ============================== UTILS ============================== */

export async function warmupAI(model: AIModelInput = STUDY_MODEL): Promise<void> {
  try {
    const choice = normalizeModelChoice(model);
    if (!(await isModelDownloaded(choice))) return;

    const engine = await getContext(choice);

    await engine.completion({
      prompt: formatPromptForModel(
        choice,
        [{ id: "warmup", role: "user", content: "Say ready." }],
        "You are ready."
      ),
      n_predict: 8,
      temperature: 0.1,
      stop: ["<|im_end|>", "<end_of_turn>", "User:"],
    });

    if (choice === STUDY_MODEL) {
      await releaseLoadedContext();
    }
  } catch {}
}

export async function releaseContext(): Promise<void> {
  await releaseLoadedContext({
    resetState: true,
    clearCaches: true,
  });
}