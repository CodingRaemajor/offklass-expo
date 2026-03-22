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

/* ============================== MODEL CONFIG ============================== */

const ACTIVE_MODEL: ModelChoice = "smollm2";
const MODEL_CTX = 4096;
const CHAT_N_PREDICT = 512;
const QUIZ_N_PREDICT = 1400;
const FLASHCARD_N_PREDICT = 900;

/* ============================== CLEANING ============================== */

function stripPromptArtifacts(input: string) {
  return (input ?? "").replace(
    /<\s*\/?\s*(start_of_turn|end_of_turn|bos|eos|im_start|im_end)\s*>/gi,
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
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================== SYSTEM PROMPT ============================== */

const DEFAULT_SYSTEM_PROMPT = `
You are Offklass AI, a kind and patient offline tutor for children.

Your job:
- Help Grade 4 students learn math clearly and safely
- Explain in very simple words
- Give short answers first
- Show steps when solving math
- Stay focused on the lesson, quiz, or flashcard topic
- Be encouraging and calm

Rules:
- Use easy English a child can understand
- Keep answers short, direct, and accurate
- Do not use hard words unless you explain them
- Do not mention being an AI model
- If the student asks something unrelated, gently bring them back to learning
- If solving math, show the answer step by step
- If giving multiple choice help, pick one best answer and explain why
- If creating study content, make it clear, correct, and easy to review
- If you are not sure, say: "Let's solve it step by step."

Style:
- Friendly
- Short
- Clear
- Supportive
- Kid-safe

Never:
- Give unsafe, harmful, or adult content
- Use rude language
- Give confusing or advanced explanations
- Output markdown tables unless asked

For quizzes:
- Prefer a smooth difficulty rise from easier to harder
- Keep questions fun, fair, and confidence-building
- Reward effort with short encouraging explanations

For flashcards:
- Focus on important ideas, not vague prompts
- Make cards useful for fast revision and memory

You are the learning buddy inside Offklass.
`.trim();

function formatMessagesForSmolLM(
  messages: Message[],
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): string {
  const parts: string[] = [];

  parts.push(`System:\n${stripPromptArtifacts(systemPrompt)}\n`);

  for (const msg of messages) {
    if (msg.role === "system") continue;

    if (msg.role === "user") {
      parts.push(`User:\n${stripPromptArtifacts(msg.content)}\n`);
    } else {
      parts.push(`Assistant:\n${stripPromptArtifacts(msg.content)}\n`);
    }
  }

  parts.push("Assistant:\n");
  return parts.join("\n");
}

/* ============================== MODEL / CONTEXT ============================== */

async function getContext(
  choice: ModelChoice = ACTIVE_MODEL
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

  await new Promise((r) => setTimeout(r, 200));

  setState("loading");

  ctx = await initLlama({
    model: modelPath,
    n_ctx: MODEL_CTX,
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
    await getContext(ACTIVE_MODEL);
  } catch (e: any) {
    setState("error", String(e?.message ?? e));
    throw e;
  }
}

/* ============================== TRANSCRIPT HELPERS ============================== */

function pickRelevantTranscript(
  transcript: string,
  maxChars: number = 900
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

  if (t.includes("multiplication") || t.includes("array") || t.includes("groups")) {
    return [
      "Q1-Q3: recall basic facts",
      "Q4-Q7: equal groups and fact matching",
      "Q8-Q10: short solve-it or compare-it multiplication questions",
    ].join("\n");
  }

  if (t.includes("division") || t.includes("quotient") || t.includes("remainder")) {
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

/* ============================== QUIZ GENERATION ============================== */

const QUIZ_COUNT = 10;
const AI_QUIZ_TARGET = 10;

const QUIZ_GENERATION_PROMPT = `
You are generating a gamified Grade 4 math quiz.

Create EXACTLY 10 multiple choice questions from the transcript.

STRICT FORMAT (follow EXACTLY):

Q1: <question>
A) <option>
B) <option>
C) <option>
D) <option>
ANS: <copy EXACT option text>
WHY: <short explanation>

Q2: ...
Q3: ...
Q4: ...
Q5: ...
Q6: ...
Q7: ...
Q8: ...
Q9: ...
Q10: ...

ADAPTIVE QUIZ RULES:
- Make Q1-Q3 easy warm-up questions
- Make Q4-Q7 medium difficulty
- Make Q8-Q10 a little more challenging, but still Grade 4
- Build confidence first, then increase challenge
- Use a mix of concept, recognition, and solving questions

GAMIFIED RULES:
- Make the quiz feel fun and motivating
- WHY must sound encouraging, like a learning coach
- Keep WHY short and positive
- Do not add score labels, emojis, or extra headings

VERY IMPORTANT RULES:
- Use ONLY the transcript
- Grade 4 level ONLY
- Each question must be simple and clear
- Options must be SHORT
- EXACTLY 4 options (A-D)
- ONLY 1 correct answer
- ANS must EXACTLY match one option (character by character)
- Do NOT skip numbering
- Do NOT repeat questions
- Do NOT output markdown or JSON
- Do NOT add intro or summary

MATH ACCURACY RULES:
- Ensure answers are 100% correct
- If arithmetic is used, calculate carefully
- Avoid tricky wording
- Prefer simple, fair questions over clever ones

OUTPUT:
Start directly from Q1 and end at Q10.
`.trim();

export async function generateQuizFromTranscript(
  transcript: string,
  lessonTitle: string,
  topic: string
): Promise<GeneratedQuestion[]> {
  try {
    const engine = await getContext(ACTIVE_MODEL);
    const compactTranscript = pickRelevantTranscript(transcript, 900);

    const prompt =
      `${QUIZ_GENERATION_PROMPT}\n\n` +
      `Lesson: ${lessonTitle}\n` +
      `Topic: ${topic}\n\n` +
      `Difficulty ladder:\n${inferQuizLadder(topic, compactTranscript)}\n\n` +
      `Transcript:\n${compactTranscript}\n\n` +
      `Create the 10 questions now.`;

    const started = Date.now();

    const { text } = await engine.completion({
      prompt: formatMessagesForSmolLM([
        { id: "quiz_user_1", role: "user", content: prompt },
      ]),
      n_predict: QUIZ_N_PREDICT,
      temperature: 0.1,
      top_p: 0.85,
      top_k: 20,
      stop: ["User:", "System:", "Assistant: Q11:"],
    });

    const cleaned = cleanModelOutput(text);

    console.log("----------- QUIZ RAW RESPONSE START -----------");
    console.log(cleaned);
    console.log("----------- QUIZ RAW RESPONSE END -----------");
    console.log(
      `Quiz generation time: ${((Date.now() - started) / 1000).toFixed(2)}s`
    );

    let parsed = parseQuizResponse(cleaned, lessonTitle, topic);
    parsed = postProcessGeneratedQuestions(parsed, topic);

    console.log("AI-generated quiz count:", parsed.length);

    const finalQuiz = fillQuizWithFallbacks(parsed, topic);

    console.log("Final quiz count:", finalQuiz.length);

    return finalQuiz.slice(0, QUIZ_COUNT);
  } catch (err) {
    console.error("Quiz generation error:", err);
    return fillQuizWithFallbacks([], topic).slice(0, QUIZ_COUNT);
  }
}

/* ============================== FLASHCARD GENERATION ============================== */

const FLASHCARD_COUNT = 10;
const FLASHCARD_AI_TARGET = 8;

const FLASHCARD_GENERATION_PROMPT = `
You are creating Grade 4 math study flashcards.

Create EXACTLY 8 high-quality flashcards from the transcript.

STRICT FORMAT:

F1: <front>
B1: <back>
T1: <topic>

F2: <front>
B2: <back>
T2: <topic>

Continue until F8 / B8 / T8.

FLASHCARD QUALITY RULES:
- Use ONLY the transcript
- Grade 4 level ONLY
- FRONT must test a real idea, fact, value, step, or mini-problem
- BACK must give a short, correct, useful answer
- Keep front and back SHORT
- Topic must be 1-3 words
- Make cards good for quick revision
- Use a mix of:
  - meaning cards
  - place value or fact cards
  - short solve-it cards
  - rule or step cards
- No repeated cards
- No vague cards like:
  - "What does this mean?"
  - "Practice this"
  - "What should you remember?"
- Prefer direct cards like:
  - "What is place value?"
  - "What is the value of 4 in 245?"
  - "How do you check subtraction?"
  - "What is 6 x 4?"

OUTPUT RULES:
- Start directly from F1
- No introduction
- No summary
- No markdown
- No JSON
`.trim();

function parseFlashcardResponse(response: string): GeneratedFlashcard[] {
  const out: GeneratedFlashcard[] = [];
  const txt = (response ?? "").replace(/\r\n/g, "\n").trim();
  if (!txt) return out;

  const blocks = txt
    .split(/\n(?=F\d+:\s*)/g)
    .map((b) => b.trim())
    .filter(Boolean);

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    const front = b.match(/^F\d+:\s*(.+)$/m)?.[1]?.trim();
    const back = b.match(/^B\d+:\s*(.+)$/m)?.[1]?.trim();
    const topic = b.match(/^T\d+:\s*(.+)$/m)?.[1]?.trim();

    if (!front || !back) continue;

    out.push({
      id: i + 1,
      front: normalizeSpace(front),
      back: normalizeSpace(back),
      topic: normalizeSpace(topic || "General"),
    });
  }

  return dedupeFlashcards(out).slice(0, FLASHCARD_AI_TARGET);
}

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

function makeFlashcardFrontFromSentence(sentence: string, unitTitle: string): string {
  const s = normalizeSpace(sentence);

  const placeValueMatch = s.match(/value of (\d) in (\d+)/i);
  if (placeValueMatch) {
    return `What is the value of ${placeValueMatch[1]} in ${placeValueMatch[2]}?`;
  }

  const isMatch = s.match(/^(.+?) is (.+)$/i);
  if (isMatch && isMatch[1].length <= 40) {
    return `What is ${normalizeSpace(isMatch[1])}?`;
  }

  if (/how to|how do|steps?|first,|next,|then,/i.test(s)) {
    return `What steps should you follow?`;
  }

  if (/add|subtract|multiply|divide|groups|place value|expanded form/i.test(s)) {
    return `What math idea does this teach?`;
  }

  return `What do you learn in ${unitTitle}?`;
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
        s.length > 12 &&
        s.length < 120 &&
        !s.startsWith("-") &&
        !/^(welcome|hi|hey|hello)/i.test(s)
    );

  const cards: GeneratedFlashcard[] = [];

  for (let i = 0; i < Math.min(sentences.length, FLASHCARD_COUNT); i++) {
    const sentence = sentences[i];

    cards.push({
      id: i + 1,
      front: makeFlashcardFrontFromSentence(sentence, unitTitle),
      back: sentence,
      topic: unitTitle,
    });
  }

  const genericCards: GeneratedFlashcard[] = [
    {
      id: 1001,
      front: `What is ${unitTitle}?`,
      back: `${unitTitle} is a Grade 4 math topic.`,
      topic: unitTitle,
    },
    {
      id: 1002,
      front: `Why is ${unitTitle} important?`,
      back: `It helps build strong math basics.`,
      topic: unitTitle,
    },
    {
      id: 1003,
      front: `How should you solve problems?`,
      back: `Go step by step and check your answer.`,
      topic: unitTitle,
    },
    {
      id: 1004,
      front: `How can you check your answer?`,
      back: `Use the reverse operation or count again.`,
      topic: unitTitle,
    },
  ];

  for (const card of genericCards) {
    if (cards.length >= FLASHCARD_COUNT) break;
    cards.push({ ...card, id: cards.length + 1 });
  }

  return dedupeFlashcards(cards)
    .slice(0, FLASHCARD_COUNT)
    .map((card, index) => ({ ...card, id: index + 1 }));
}

export async function generateFlashcardsFromTranscript(
  transcript: string,
  unitTitle: string
): Promise<GeneratedFlashcard[]> {
  try {
    const engine = await getContext(ACTIVE_MODEL);
    const compactTranscript = pickRelevantTranscript(transcript, 850);

    const prompt =
      `${FLASHCARD_GENERATION_PROMPT}\n\n` +
      `Unit: ${unitTitle}\n\n` +
      `Transcript:\n${compactTranscript}\n\n` +
      `Create the 8 flashcards now.`;

    const started = Date.now();

    const { text } = await engine.completion({
      prompt: formatMessagesForSmolLM([
        { id: "flash_user_1", role: "user", content: prompt },
      ]),
      n_predict: FLASHCARD_N_PREDICT,
      temperature: 0.2,
      top_p: 0.85,
      top_k: 20,
      stop: ["User:", "System:", "Assistant: F9:"],
    });

    const cleaned = cleanModelOutput(text);

    console.log("----------- FLASHCARD RAW RESPONSE START -----------");
    console.log(cleaned);
    console.log("----------- FLASHCARD RAW RESPONSE END -----------");
    console.log(
      `Flashcard generation time: ${((Date.now() - started) / 1000).toFixed(
        2
      )}s`
    );

    const parsed = parseFlashcardResponse(cleaned);

    console.log("Parsed flashcard count:", parsed.length);

    if (parsed.length >= 3) {
      const aiCards = parsed.slice(0, FLASHCARD_COUNT).map((card, index) => ({
        ...card,
        id: index + 1,
        topic: card.topic || unitTitle,
      }));

      if (aiCards.length >= FLASHCARD_COUNT) {
        return aiCards.slice(0, FLASHCARD_COUNT);
      }

      const fallback = buildFlashcardFallback(compactTranscript, unitTitle);
      const used = new Set(
        aiCards.map((c) => normalizeSpace(c.front).toLowerCase())
      );

      const combined = [...aiCards];
      for (const card of fallback) {
        const key = normalizeSpace(card.front).toLowerCase();
        if (used.has(key)) continue;
        combined.push({ ...card, id: combined.length + 1 });
        used.add(key);
        if (combined.length >= FLASHCARD_COUNT) break;
      }

      return combined.slice(0, FLASHCARD_COUNT);
    }

    console.log("AI produced too few cards, using fallback");
    return buildFlashcardFallback(compactTranscript, unitTitle);
  } catch (err) {
    console.error("Flashcard generation error:", err);
    return buildFlashcardFallback(
      pickRelevantTranscript(transcript, 850),
      unitTitle
    );
  }
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

  return out.slice(0, AI_QUIZ_TARGET);
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
          normalizeSpace(opt).toLowerCase() === placeValueAnswer.toLowerCase()
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
    makeQ(
      base + 1,
      topic,
      "What is 36 + 24?",
      ["50", "60", "62", "72"],
      "60",
      "36 + 24 = 60."
    ),
    makeQ(
      base + 2,
      topic,
      "What is 75 - 18?",
      ["57", "67", "63", "56"],
      "57",
      "75 - 18 = 57."
    ),
    makeQ(
      base + 3,
      topic,
      "What is 48 + 12?",
      ["50", "60", "70", "58"],
      "60",
      "48 + 12 = 60."
    ),
    makeQ(
      base + 4,
      topic,
      "What is 90 - 25?",
      ["75", "65", "55", "60"],
      "65",
      "90 - 25 = 65."
    ),
    makeQ(
      base + 5,
      topic,
      "Which sum is correct?",
      ["23 + 14 = 37", "23 + 14 = 36", "23 + 14 = 35", "23 + 14 = 38"],
      "23 + 14 = 37",
      "23 plus 14 equals 37."
    ),
    makeQ(
      base + 6,
      topic,
      "Which difference is correct?",
      ["54 - 21 = 33", "54 - 21 = 23", "54 - 21 = 43", "54 - 21 = 31"],
      "54 - 21 = 33",
      "54 minus 21 equals 33."
    ),
    makeQ(
      base + 7,
      topic,
      "What is 67 + 5?",
      ["71", "72", "73", "74"],
      "72",
      "67 + 5 = 72."
    ),
    makeQ(
      base + 8,
      topic,
      "What is 100 - 46?",
      ["54", "64", "44", "56"],
      "54",
      "100 - 46 = 54."
    ),
    makeQ(
      base + 9,
      topic,
      "What is 29 + 30?",
      ["49", "59", "69", "39"],
      "59",
      "29 + 30 = 59."
    ),
    makeQ(
      base + 10,
      topic,
      "What is 81 - 9?",
      ["71", "72", "73", "74"],
      "72",
      "81 - 9 = 72."
    ),
  ];
}

function getMultiplicationFallback(topic: string): GeneratedQuestion[] {
  const base = Date.now() + 2000;
  return [
    makeQ(
      base + 1,
      topic,
      "What is 4 × 3?",
      ["7", "12", "8", "16"],
      "12",
      "4 groups of 3 is 12."
    ),
    makeQ(
      base + 2,
      topic,
      "What is 6 × 5?",
      ["30", "25", "35", "20"],
      "30",
      "6 times 5 is 30."
    ),
    makeQ(
      base + 3,
      topic,
      "What is 7 × 2?",
      ["14", "12", "16", "10"],
      "14",
      "7 times 2 is 14."
    ),
    makeQ(
      base + 4,
      topic,
      "What is 9 × 3?",
      ["18", "21", "27", "24"],
      "27",
      "9 times 3 is 27."
    ),
    makeQ(
      base + 5,
      topic,
      "What is 8 × 4?",
      ["28", "30", "32", "36"],
      "32",
      "8 times 4 is 32."
    ),
    makeQ(
      base + 6,
      topic,
      "Which multiplication fact is correct?",
      ["5 × 4 = 20", "5 × 4 = 15", "5 × 4 = 25", "5 × 4 = 10"],
      "5 × 4 = 20",
      "5 groups of 4 is 20."
    ),
    makeQ(
      base + 7,
      topic,
      "What is 3 × 10?",
      ["13", "30", "20", "40"],
      "30",
      "3 times 10 is 30."
    ),
    makeQ(
      base + 8,
      topic,
      "What is 2 × 9?",
      ["18", "16", "20", "12"],
      "18",
      "2 times 9 is 18."
    ),
    makeQ(
      base + 9,
      topic,
      "What is 7 × 7?",
      ["42", "48", "49", "56"],
      "49",
      "7 times 7 is 49."
    ),
    makeQ(
      base + 10,
      topic,
      "What is 5 × 8?",
      ["35", "40", "45", "30"],
      "40",
      "5 times 8 is 40."
    ),
  ];
}

function getDivisionFallback(topic: string): GeneratedQuestion[] {
  const base = Date.now() + 3000;
  return [
    makeQ(
      base + 1,
      topic,
      "What is 12 ÷ 3?",
      ["2", "3", "4", "6"],
      "4",
      "12 split into 3 equal groups is 4."
    ),
    makeQ(
      base + 2,
      topic,
      "What is 20 ÷ 5?",
      ["2", "4", "5", "10"],
      "4",
      "20 divided by 5 is 4."
    ),
    makeQ(
      base + 3,
      topic,
      "What is 18 ÷ 2?",
      ["8", "9", "6", "7"],
      "9",
      "18 divided by 2 is 9."
    ),
    makeQ(
      base + 4,
      topic,
      "What is 24 ÷ 6?",
      ["3", "4", "5", "6"],
      "4",
      "24 divided by 6 is 4."
    ),
    makeQ(
      base + 5,
      topic,
      "What is 16 ÷ 4?",
      ["2", "4", "6", "8"],
      "4",
      "16 divided by 4 is 4."
    ),
    makeQ(
      base + 6,
      topic,
      "Which division fact is correct?",
      ["15 ÷ 3 = 5", "15 ÷ 3 = 4", "15 ÷ 3 = 6", "15 ÷ 3 = 3"],
      "15 ÷ 3 = 5",
      "15 divided by 3 is 5."
    ),
    makeQ(
      base + 7,
      topic,
      "What is 30 ÷ 5?",
      ["5", "6", "7", "8"],
      "6",
      "30 divided by 5 is 6."
    ),
    makeQ(
      base + 8,
      topic,
      "What is 21 ÷ 7?",
      ["2", "3", "4", "5"],
      "3",
      "21 divided by 7 is 3."
    ),
    makeQ(
      base + 9,
      topic,
      "What is 27 ÷ 9?",
      ["2", "3", "4", "5"],
      "3",
      "27 divided by 9 is 3."
    ),
    makeQ(
      base + 10,
      topic,
      "What is 14 ÷ 7?",
      ["1", "2", "3", "4"],
      "2",
      "14 divided by 7 is 2."
    ),
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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
      content: aiError || "AI Error",
    };
  }

  const lastUser = [...history].reverse().find((m) => m.role === "user");

  if (!lastUser) {
    return {
      id: "empty",
      role: "assistant",
      content: "I'm Offklass AI. Tell me your grade and math topic 😊",
    };
  }

  if (isGreeting(lastUser.content)) {
    return {
      id: "greet",
      role: "assistant",
      content: "Hi! I can help you with Grade 4 math. What topic are you learning? 😊",
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
      const engine = await getContext(ACTIVE_MODEL);

      const startTime = Date.now();
      console.log("AI response started at:", startTime);

      const recentHistory = history.slice(-5);

      const { text } = await engine.completion({
        prompt: formatMessagesForSmolLM(recentHistory),
        n_predict: CHAT_N_PREDICT,
        temperature: 0.3,
        top_p: 0.85,
        top_k: 20,
        stop: ["User:", "System:"],
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.warn("AI response ended at:", endTime);
      console.warn("AI response time:", responseTime, "ms");
      console.warn(
        `AI response time: ${(responseTime / 1000).toFixed(2)} seconds`
      );

      const cleaned = cleanModelOutput(text);

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
    const engine = await getContext(ACTIVE_MODEL);
    await engine.completion({
      prompt: "System:\nYou are ready.\n\nAssistant:\n",
      n_predict: 1,
    });
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