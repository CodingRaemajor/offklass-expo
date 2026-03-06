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

export function cleanGemmaOutput(text: string): string {
  if (!text) return "";

  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\*\s+/gm, "• ")
    .replace(/`{1,3}/g, "")
    .replace(/<\s*\/?\s*(start_of_turn|end_of_turn|bos|eos)\s*>/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================== PROMPT FORMAT ============================== */

function formatMessagesForGemma(
  messages: Message[],
  systemPrompt: string = ""
): string {
  let out = "<bos>";

  if (systemPrompt) {
    out += `<start_of_turn>user\n${stripPromptTokens(
      systemPrompt
    )}<end_of_turn>\n`;
  }

  for (const msg of messages) {
    if (msg.role === "system") continue;
    const role = msg.role === "user" ? "user" : "model";
    out += `<start_of_turn>${role}\n${stripPromptTokens(
      msg.content
    )}<end_of_turn>\n`;
  }

  out += "<start_of_turn>model\n";
  return out;
}

/* ============================== MODEL / CONTEXT ============================== */

async function getContext(
  choice: ModelChoice = "gemma2b"
): Promise<LlamaContext> {
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

const QUIZ_COUNT = 10;

const QUIZ_GENERATION_PROMPT = `
You are Offklass AI. Create exactly 10 multiple choice math questions for Grade 4 using ONLY the transcript facts.

OUTPUT FORMAT (STRICT, NO MARKDOWN):
Q1: <question>
A) <option>
B) <option>
C) <option>
D) <option>
ANS: <exact option text>
WHY: <one short sentence explanation>

Q2: <question>
A) <option>
B) <option>
C) <option>
D) <option>
ANS: <exact option text>
WHY: <one short sentence explanation>

Continue until Q10.

RULES:
- Use only transcript content.
- Each question must be Grade 4 appropriate.
- Make most questions number-based.
- Exactly 4 options per question.
- Options must be real answer choices, not filler.
- "ANS:" must match one option exactly.
- "WHY:" should be short and simple.
- No intro.
- No summary.
- No extra commentary.
- No repeated questions.

Transcript:
`;

const QUIZ_REPAIR_PROMPT = `
Fix the text below into exactly 10 multiple choice quiz questions.

STRICT FORMAT:
Q1: <question>
A) <option>
B) <option>
C) <option>
D) <option>
ANS: <exact option text>
WHY: <one short sentence explanation>

Continue until Q10.

RULES:
- No intro
- No summary
- No markdown
- Each question must have exactly 4 options
- ANS must match one option exactly
- Keep questions simple and Grade 4 friendly
- Use the source text only

Source text:
`;

export async function generateQuizFromTranscript(
  transcript: string,
  lessonTitle: string,
  topic: string
): Promise<GeneratedQuestion[]> {
  try {
    const engine = await getContext("gemma2b");

    const trimmedTranscript = (transcript ?? "").slice(0, 6000);

    const prompt =
      QUIZ_GENERATION_PROMPT +
      trimmedTranscript +
      `\n\nLesson: ${lessonTitle}\nTopic: ${topic}\n\nCreate the 10 questions now.`;

    const { text } = await engine.completion({
      prompt: formatMessagesForGemma([
        { id: "qz1", role: "user", content: prompt },
      ]),
      n_predict: 1400,
      temperature: 0.1,
      top_p: 0.9,
      stop: ["<end_of_turn>", "<eos>"],
    });

    const cleaned = cleanGemmaOutput(text);

    console.log("----------- QUIZ RAW RESPONSE START -----------");
    console.log(cleaned);
    console.log("----------- QUIZ RAW RESPONSE END -----------");

    let parsed = parseQuizResponse(cleaned, lessonTitle, topic);
    parsed = postProcessGeneratedQuestions(parsed, topic);

    console.log("First sanitized quiz count:", parsed.length);

    if (parsed.length >= QUIZ_COUNT) {
      return parsed.slice(0, QUIZ_COUNT);
    }

    console.log("Attempting quiz repair pass...");

    const repairPrompt =
      QUIZ_REPAIR_PROMPT +
      cleaned +
      `\n\nLesson: ${lessonTitle}\nTopic: ${topic}\n\nFix the quiz now.`;

    const repaired = await engine.completion({
      prompt: formatMessagesForGemma([
        { id: "qz2", role: "user", content: repairPrompt },
      ]),
      n_predict: 1400,
      temperature: 0.05,
      top_p: 0.9,
      stop: ["<end_of_turn>", "<eos>"],
    });

    const cleanedRepair = cleanGemmaOutput(repaired.text);

    console.log("----------- QUIZ REPAIR RESPONSE START -----------");
    console.log(cleanedRepair);
    console.log("----------- QUIZ REPAIR RESPONSE END -----------");

    let repairedParsed = parseQuizResponse(cleanedRepair, lessonTitle, topic);
    repairedParsed = postProcessGeneratedQuestions(repairedParsed, topic);

    console.log("Second sanitized quiz count:", repairedParsed.length);

    const combined = postProcessGeneratedQuestions(
      [...parsed, ...repairedParsed],
      topic
    );

    const finalQuiz = fillQuizWithFallbacks(combined, topic);

    console.log("Final quiz count:", finalQuiz.length);

    return finalQuiz.slice(0, QUIZ_COUNT);
  } catch (err) {
    console.error("Quiz generation error:", err);
    return fillQuizWithFallbacks([], topic).slice(0, QUIZ_COUNT);
  }
}

/* ============================== QUIZ PARSER ============================== */

function normalizeSpace(s: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

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
        (opt) => normalizeSpace(opt).toLowerCase() === placeValueAnswer.toLowerCase()
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

  const normalizedOptions = q.options.map((o) => normalizeSpace(o).toLowerCase());

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
      .map((q) => {
        const fixed = fixQuestionMath({
          ...q,
          topic,
          question: normalizeSpace(q.question),
          options: q.options.map((o) => normalizeSpace(o)),
          correctAnswer: normalizeSpace(q.correctAnswer),
          explanation: normalizeSpace(
            q.explanation || "Good job! Keep practicing!"
          ),
        });

        return fixed;
      })
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
    explanation,
  };
}

function getPlaceValueFallback(topic: string): GeneratedQuestion[] {
  const base = Date.now();
  return [
    makeQ(base + 1, topic, "What is the value of 5 in 254?", ["5", "50", "500", "25"], "50", "The 5 is in the tens place."),
    makeQ(base + 2, topic, "Which number has 4 tens and 7 ones?", ["47", "74", "407", "470"], "47", "4 tens and 7 ones make 47."),
    makeQ(base + 3, topic, "What is the value of 3 in 325?", ["3", "30", "300", "35"], "300", "The 3 is in the hundreds place."),
    makeQ(base + 4, topic, "Which expanded form matches 423?", ["400 + 20 + 3", "40 + 20 + 3", "4 + 2 + 3", "400 + 2 + 3"], "400 + 20 + 3", "423 has 4 hundreds, 2 tens, 3 ones."),
    makeQ(base + 5, topic, "What is the value of 7 in 172?", ["7", "70", "700", "17"], "70", "The 7 is in the tens place."),
    makeQ(base + 6, topic, "Which number is 6 hundreds, 1 ten, and 2 ones?", ["612", "621", "162", "602"], "612", "600 + 10 + 2 = 612."),
    makeQ(base + 7, topic, "Which number is greater?", ["34", "43", "They are equal", "Cannot tell"], "43", "43 has more tens."),
    makeQ(base + 8, topic, "Which digit is in the ones place in 583?", ["5", "8", "3", "58"], "3", "The ones place is the last digit."),
    makeQ(base + 9, topic, "What is the value of 8 in 480?", ["8", "80", "800", "480"], "80", "The 8 is in the tens place."),
    makeQ(base + 10, topic, "Which number is written as 300 + 40 + 6?", ["346", "364", "436", "306"], "346", "300 + 40 + 6 = 346."),
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

export async function callAI(history: Message[]): Promise<Message> {
  if (aiState === "downloading") {
    const pct = aiProgress ? `${aiProgress.percent.toFixed(1)}%` : "";
    return {
      id: "dl",
      role: "assistant",
      content: `Downloading my AI brain… 🧠 ${pct}`.trim(),
    };
  }

  if (aiState === "loading") {
    return {
      id: "ld",
      role: "assistant",
      content: "Warming up… 🔥 Almost ready!",
    };
  }

  if (aiState === "error") {
    return {
      id: "err",
      role: "assistant",
      content: "AI isn’t ready. Tap Retry to fix me.",
    };
  }

  if (inflight) {
    return {
      id: "busy",
      role: "assistant",
      content: "I'm still thinking...",
    };
  }

  const lastUser = [...history].reverse().find((m) => m.role === "user");

  if (lastUser && isGreeting(lastUser.content)) {
    return {
      id: "greet",
      role: "assistant",
      content: "Hi! I'm Offklass AI. Tell me your grade and the math topic 😊",
    };
  }

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