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
const MODEL_CTX = 2048;
const CHAT_N_PREDICT = 512;

/* ============================== LOCAL CONTENT CONFIG ============================== */

const QUIZ_COUNT = 10;
const FLASHCARD_COUNT = 10;

const quizCache = new Map<string, GeneratedQuestion[]>();
const flashcardCache = new Map<string, GeneratedFlashcard[]>();

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
    if (/place value|ones|tens|hundreds|thousands|expanded form/i.test(text)) score += 4;
    if (/add|sum|subtract|difference|regroup/i.test(text)) score += 4;
    if (/multiply|times|groups|array/i.test(text)) score += 4;
    if (/divide|quotient|remainder|equal groups/i.test(text)) score += 4;
    if (/example|means|is|are|shows|represents|remember/i.test(text)) score += 2;
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

  if (front.length < 6 || back.length < 1) return false;
  if (front.length > 120 || back.length > 140) return false;
  if (/^[A-Z\s\-]{4,}$/.test(front) && front.split(" ").length <= 5) return false;
  if (/^(what is this|practice this|remember this|what should you remember)\??$/i.test(front)) return false;
  if (/^what math idea does this teach\??$/i.test(front)) return false;
  if (new Set([front.toLowerCase(), back.toLowerCase()]).size < 2) return false;

  return !!topic;
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
    if (!dedupedOptions.some((opt) => opt.toLowerCase() === cleanCorrect.toLowerCase())) {
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

    const expanded = fact.match(/(\d[\d,]*)\s*(?:=|is)\s*([\d,]+\s*\+\s*[\d,]+(?:\s*\+\s*[\d,]+)*)/i);
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
        [String(c), String(c + 10), String(Math.max(0, c - 10)), String(c + 1)],
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
        [String(c), String(c + 10), String(Math.max(0, c - 10)), String(c + 1)],
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
        [String(c), String(c + a), String(Math.max(0, c - a)), String(c + 1)],
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
        dedupeStrings([String(sum), String(sum + 1), String(Math.max(0, sum - 1)), String(sum + 2)]),
        String(sum),
        `Add ${a} and ${b}.`
      );

      if (a >= b && out.length < 4) {
        const diff = a - b;
        addQ(
          `What is ${a} - ${b}?`,
          dedupeStrings([String(diff), String(diff + 1), String(Math.max(0, diff - 1)), String(diff + 2)]),
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
  const cacheKey = `${lessonTitle}|||${topic}|||${pickRelevantTranscript(transcript, 500)}`;
  const cached = quizCache.get(cacheKey);
  if (cached) return cached;

  const compactTranscript = pickRelevantTranscript(transcript, 650);
  const keyFacts = extractKeyFacts(compactTranscript, 8);
  const logicQuiz = buildLogicQuizFromFacts(keyFacts, topic);
  const quickQuiz = buildQuickQuizFromNumbers(compactTranscript, topic);

  const difficultyHints = inferQuizLadder(topic, compactTranscript);
  console.log("Quiz preload mode");
  console.log("Lesson:", lessonTitle);
  console.log("Topic:", topic);
  console.log("Difficulty ladder:", difficultyHints);
  console.log("Key facts:\n" + formatKeyFactsForPrompt(keyFacts));

  const merged = dedupeQuestions([...logicQuiz, ...quickQuiz]);
  const finalQuiz = fillQuizWithFallbacks(merged, topic).slice(0, QUIZ_COUNT);

  quizCache.set(cacheKey, finalQuiz);
  return finalQuiz;
}

/* ============================== FLASHCARD GENERATION ============================== */

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

  const expandedMatch = s.match(/(\d[\d,]*)\s*(?:=|is)\s*([\d,]+\s*\+\s*[\d,]+(?:\s*\+\s*[\d,]+)*)/i);
  if (expandedMatch) {
    return `What is the expanded form of ${normalizeSpace(expandedMatch[1])}?`;
  }

  const isMatch = s.match(/^(.+?) is (.+)$/i);
  if (isMatch && isMatch[1].length <= 40) {
    return `What is ${normalizeSpace(isMatch[1])}?`;
  }

  if (/how to|how do|steps?|first,|next,|then,/i.test(s)) {
    return `What steps should you follow?`;
  }

  if (/add|subtract|multiply|divide|groups|place value|expanded form/i.test(s)) {
    return `What do you need to remember?`;
  }

  return `What do you learn in ${unitTitle}?`;
}

function buildLogicFlashcardsFromFacts(facts: string[], unitTitle: string): GeneratedFlashcard[] {
  const out: GeneratedFlashcard[] = [];
  const used = new Set<string>();

  const push = (front: string, back: string, topic: string = unitTitle) => {
    const card: GeneratedFlashcard = {
      id: out.length + 1,
      front: normalizeSpace(front),
      back: normalizeSpace(back),
      topic: normalizeSpace(topic || unitTitle),
    };

    const key = `${card.front.toLowerCase()}|||${card.back.toLowerCase()}`;
    if (used.has(key) || !isStrongFlashcard(card)) return;
    used.add(key);
    out.push(card);
  };

  for (const fact of facts) {
    if (out.length >= 8) break;

    const valueMatch = fact.match(/value of (\d) in (\d+)/i);
    if (valueMatch) {
      const digit = Number(valueMatch[1]);
      const number = valueMatch[2];
      const idx = number.indexOf(String(digit));
      if (idx >= 0) {
        const value = digit * Math.pow(10, number.length - idx - 1);
        push(`What is the value of ${digit} in ${number}?`, String(value), "Place Value");
        continue;
      }
    }

    const expanded = fact.match(/(\d[\d,]*)\s*(?:=|is)\s*([\d,]+\s*\+\s*[\d,]+(?:\s*\+\s*[\d,]+)*)/i);
    if (expanded) {
      push(`What is the expanded form of ${normalizeSpace(expanded[1])}?`, normalizeSpace(expanded[2]), "Expanded Form");
      continue;
    }

    const definition = fact.match(/^(.{3,45}?) is (.+)$/i);
    if (definition) {
      const label = normalizeSpace(definition[1]);
      const answer = normalizeSpace(definition[2]).replace(/\.$/, "");
      if (answer.length <= 70) {
        push(`What is ${label}?`, answer, unitTitle);
        continue;
      }
    }

    if (/step|first|next|then|finally/i.test(fact)) {
      push(`What steps should you remember?`, fact, unitTitle);
      continue;
    }

    push(makeFlashcardFrontFromSentence(fact, unitTitle), fact, unitTitle);
  }

  return out.slice(0, 8);
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
      front: `What should you do first when solving ${unitTitle}?`,
      back: `Read carefully and solve step by step.`,
      topic: unitTitle,
    },
    {
      id: 1002,
      front: `How can you check your answer in ${unitTitle}?`,
      back: `Use the reverse operation or check each place.`,
      topic: unitTitle,
    },
    {
      id: 1003,
      front: `Why is place value or operation order important?`,
      back: `It helps you choose the correct answer.`,
      topic: unitTitle,
    },
    {
      id: 1004,
      front: `What is a good math habit during practice?`,
      back: `Work neatly and recheck your answer.`,
      topic: unitTitle,
    },
  ];

  for (const card of genericCards) {
    if (cards.length >= FLASHCARD_COUNT) break;
    cards.push({ ...card, id: cards.length + 1 });
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

export async function generateFlashcardsFromTranscript(
  transcript: string,
  unitTitle: string
): Promise<GeneratedFlashcard[]> {
  const cacheKey = `${unitTitle}|||${pickRelevantTranscript(transcript, 500)}`;
  const cached = flashcardCache.get(cacheKey);
  if (cached) return cached;

  const compactTranscript = pickRelevantTranscript(transcript, 500);
  const keyFacts = extractKeyFacts(compactTranscript, 8);
  const logicCards = buildLogicFlashcardsFromFacts(keyFacts, unitTitle);
  const quickCards = buildQuickFlashcardsFromNumbers(compactTranscript, unitTitle);
  const fallback = buildFlashcardFallback(compactTranscript, unitTitle);

  console.log("Flashcard preload mode");
  console.log("Unit:", unitTitle);
  console.log("Key facts:\n" + formatKeyFactsForPrompt(keyFacts));

  const merged = dedupeFlashcards([...logicCards, ...quickCards, ...fallback])
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

  return out.slice(0, 4);
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
    clearGeneratedStudyCaches();
    setState("idle");
  }
}