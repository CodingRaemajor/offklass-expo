// lib/ai.local.ts
import { tryMathFallback } from "./mathFallback";
import { LESSON_INFO, getLessonInfoByUnit } from "./lessonTranscripts";

/* ============================== SYSTEM PROMPT ============================== */

export const SYSTEM_PROMPT = `You are Offklass AI, a kind and patient offline tutor for children.
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
- Make cards useful for fast revision and memory`.trim();

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

type AIState = "idle" | "loading" | "ready" | "error";

type AIStatus = {
  aiState: AIState;
  aiProgress: null;
  aiError: string | null;
  hasCtx: boolean;
};

let aiState: AIState = "ready";
let aiError: string | null = null;

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeAIStatus(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAIStatus(): AIStatus {
  return {
    aiState,
    aiProgress: null,
    aiError,
    hasCtx: true,
  };
}

function setState(next: AIState, err?: string | null) {
  aiState = next;
  aiError = err ?? null;
  notify();
}

export async function prepareAI(): Promise<void> {
  setState("ready");
}

export async function warmupAI(): Promise<void> {
  setState("ready");
}

export async function releaseContext(): Promise<void> {
  setState("ready");
}

/* ============================== HELPERS ============================== */

function normalizeSpace(s: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(s: string) {
  return normalizeSpace((s ?? "").toLowerCase().replace(/[^\w\s]/g, " "));
}

function cleanModelOutput(text: string): string {
  return (text ?? "")
    .replace(/\*\*(.*?)\*\*/g, "$1")   // strip bold markdown
    .replace(/`{1,3}/g, "")            // strip code ticks
    .replace(/\r\n/g, "\n")            // normalise line endings
    .replace(/\n{3,}/g, "\n\n")        // max one blank line between blocks
    .split("\n")
    .map((line) => line.trim())        // trim each line individually
    .join("\n")
    .trim();
}
export { cleanModelOutput };

function titleCase(s: string) {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

function cloneQuestions(items: GeneratedQuestion[]): GeneratedQuestion[] {
  return items.map((q) => ({
    ...q,
    options: [...q.options],
  }));
}

function cloneFlashcards(items: GeneratedFlashcard[]): GeneratedFlashcard[] {
  return items.map((c) => ({ ...c }));
}

function makeAssistantMessage(content: string): Message {
  return {
    id: String(Date.now()),
    role: "assistant",
    content: cleanModelOutput(content),
  };
}

function inferUnitFromText(input: string): string | null {
  const q = normalizeText(input);

  if (q.includes("unit 1") || q.includes("place value") || q.includes("ones and tens")) {
    return "Unit 1: Place Value";
  }
  if (
    q.includes("unit 2") ||
    q.includes("addition") ||
    q.includes("subtraction") ||
    q.includes("regrouping")
  ) {
    return "Unit 2: Addition & Subtraction";
  }
  if (
    q.includes("unit 3") ||
    q.includes("multiplication") ||
    q.includes("multiply") ||
    q.includes("area model") ||
    q.includes("partial products")
  ) {
    return "Unit 3: Multiplication";
  }
  if (
    q.includes("unit 4") ||
    q.includes("division") ||
    q.includes("divide") ||
    q.includes("quotient") ||
    q.includes("remainder")
  ) {
    return "Unit 4: Division";
  }

  return null;
}

function normalizeUnit(input?: string | null): string | null {
  if (!input) return null;
  const q = normalizeText(input);

  if (q.includes("unit 1") || q.includes("place value")) return "Unit 1: Place Value";
  if (q.includes("unit 2") || q.includes("addition") || q.includes("subtraction")) {
    return "Unit 2: Addition & Subtraction";
  }
  if (q.includes("unit 3") || q.includes("multiplication")) return "Unit 3: Multiplication";
  if (q.includes("unit 4") || q.includes("division")) return "Unit 4: Division";

  const exact = LESSON_INFO.find((lesson) => normalizeText(lesson.unit) === q);
  return exact?.unit ?? null;
}

function detectRequestedUnit(unit?: string, transcript?: string, topic?: string): string {
  return (
    normalizeUnit(unit) ||
    inferUnitFromText(topic ?? "") ||
    inferUnitFromText(transcript ?? "") ||
    "Unit 1: Place Value"
  );
}

function getReadableLessonSummary(unit: string): string {
  const lessons = getLessonInfoByUnit(unit);
  if (!lessons.length) return unit;

  const titles = lessons.map((l) => l.title).join(", ");
  const topics = lessons.map((l) => l.topic).join(", ");

  return `This unit covers: ${titles}.\nMain ideas: ${topics}.`;
}

function keywordScore(input: string, keywords: string[]) {
  const q = normalizeText(input);
  let score = 0;

  for (const keyword of keywords) {
    const k = normalizeText(keyword);
    if (!k) continue;
    if (q === k) score += 30;
    else if (q.includes(k)) score += 12;
  }

  return score;
}

/* ============================== KNOWLEDGE LIBRARY ============================== */

type KnowledgeItem = {
  id: string;
  unit: string;
  topic: string;
  keywords: string[];
  questions: string[];
  answer: string;
  example?: string;
  hint?: string;
};

const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: "pv-1",
    unit: "Unit 1: Place Value",
    topic: "Place Value",
    keywords: ["place value", "digit value", "value of digit", "ones tens hundreds"],
    questions: [
      "what is place value",
      "explain place value",
      "what does place value mean",
      "what is digit value",
    ],
    answer:
      "Place value tells how much a digit is worth based on its position in a number.",
    example:
      "In 452, the 4 means 400, the 5 means 50, and the 2 means 2.",
    hint: "Look at where the digit sits: ones, tens, or hundreds.",
  },
  {
    id: "pv-2",
    unit: "Unit 1: Place Value",
    topic: "Ones and Tens",
    keywords: ["ones", "tens", "ones place", "tens place"],
    questions: [
      "what are ones and tens",
      "explain ones and tens",
      "what is ones place",
      "what is tens place",
    ],
    answer:
      "The ones place shows single units. The tens place shows groups of ten.",
    example: "In 36, the 3 means 3 tens or 30, and the 6 means 6 ones.",
    hint: "Move one place left and the value becomes 10 times bigger.",
  },
  {
    id: "pv-3",
    unit: "Unit 1: Place Value",
    topic: "Expanded Form",
    keywords: ["expanded form", "write in expanded form", "standard form"],
    questions: [
      "what is expanded form",
      "how do i write expanded form",
      "explain standard form and expanded form",
    ],
    answer:
      "Expanded form breaks a number into the value of each digit. Standard form is the regular number.",
    example: "482 = 400 + 80 + 2.",
    hint: "Write each digit using its place value.",
  },
  {
    id: "as-1",
    unit: "Unit 2: Addition & Subtraction",
    topic: "Addition",
    keywords: ["addition", "add", "sum", "adding numbers"],
    questions: [
      "what is addition",
      "explain addition",
      "how do i add numbers",
    ],
    answer:
      "Addition means putting numbers together to find the total.",
    example: "27 + 15 = 42.",
    hint: "Line up place values before adding.",
  },
  {
    id: "as-2",
    unit: "Unit 2: Addition & Subtraction",
    topic: "Subtraction",
    keywords: ["subtraction", "subtract", "difference", "take away"],
    questions: [
      "what is subtraction",
      "explain subtraction",
      "how do i subtract numbers",
    ],
    answer:
      "Subtraction means taking one amount away from another to find the difference.",
    example: "52 - 19 = 33.",
    hint: "Start subtracting from the ones place.",
  },
  {
    id: "as-3",
    unit: "Unit 2: Addition & Subtraction",
    topic: "Regrouping",
    keywords: ["regrouping", "borrow", "carry", "rename"],
    questions: [
      "what is regrouping",
      "how does regrouping work",
      "explain borrowing in subtraction",
      "explain carrying in addition",
    ],
    answer:
      "Regrouping means moving value from one place to another when a place does not have enough.",
    example:
      "For 42 - 18, regroup 42 into 3 tens and 12 ones, then subtract.",
    hint: "Think of one ten as 10 ones.",
  },
  {
    id: "mul-1",
    unit: "Unit 3: Multiplication",
    topic: "Multiplication",
    keywords: ["multiplication", "multiply", "times", "groups of"],
    questions: [
      "what is multiplication",
      "explain multiplication",
      "how does multiplication work",
    ],
    answer:
      "Multiplication is repeated addition. It tells how many items are in equal groups.",
    example: "3 × 4 means 3 groups of 4, so 4 + 4 + 4 = 12.",
    hint: "Read multiplication as groups of.",
  },
  {
    id: "mul-2",
    unit: "Unit 3: Multiplication",
    topic: "Area Models",
    keywords: ["area model", "box method", "area model multiplication"],
    questions: [
      "what is an area model",
      "explain area model multiplication",
    ],
    answer:
      "An area model splits numbers into parts to make multiplication easier.",
    example:
      "13 × 4 can be split into (10 × 4) + (3 × 4) = 40 + 12 = 52.",
    hint: "Break a number into tens and ones first.",
  },
  {
    id: "mul-3",
    unit: "Unit 3: Multiplication",
    topic: "Partial Products",
    keywords: ["partial products", "two digit multiplication"],
    questions: [
      "what are partial products",
      "explain partial products",
    ],
    answer:
      "Partial products are the smaller multiplication results you add together to get the final answer.",
    example:
      "23 × 5 = (20 × 5) + (3 × 5) = 100 + 15 = 115.",
    hint: "Multiply each part, then add the parts.",
  },
  {
    id: "div-1",
    unit: "Unit 4: Division",
    topic: "Division",
    keywords: ["division", "divide", "shared equally", "equal groups"],
    questions: [
      "what is division",
      "explain division",
      "how does division work",
    ],
    answer:
      "Division means splitting a total into equal groups.",
    example: "12 ÷ 3 = 4 means 12 split into 3 equal groups gives 4 in each group.",
    hint: "Think: how many in each group or how many groups?",
  },
  {
    id: "div-2",
    unit: "Unit 4: Division",
    topic: "Quotient and Remainder",
    keywords: ["quotient", "remainder", "left over"],
    questions: [
      "what is a quotient",
      "what is a remainder",
      "explain quotient and remainder",
    ],
    answer:
      "The quotient is the answer to a division problem. The remainder is what is left over if it cannot be shared equally.",
    example: "14 ÷ 4 = 3 remainder 2.",
    hint: "Multiply the quotient by the divisor and add the remainder to check.",
  },
  {
    id: "div-3",
    unit: "Unit 4: Division",
    topic: "Division Word Problems",
    keywords: ["division word problem", "sharing problem", "groups problem"],
    questions: [
      "how do i solve division word problems",
      "explain division word problems",
    ],
    answer:
      "Find the total, find how many groups or how many in each group, then divide.",
    example:
      "If 20 cookies are shared by 5 children, each child gets 20 ÷ 5 = 4 cookies.",
    hint: "Look for words like shared equally, each, and groups.",
  },
];

function formatKnowledgeAnswer(item: KnowledgeItem) {
  const parts = [
    `Answer:\n${item.answer}`,
    item.example ? `\nExample:\n${item.example}` : "",
    item.hint ? `\nHint:\n${item.hint}` : "",
  ].filter(Boolean);

  return parts.join("\n");
}

function lookupKnowledge(input: string, preferredUnit?: string | null): KnowledgeItem | null {
  const q = normalizeText(input);
  let best: KnowledgeItem | null = null;
  let bestScore = 0;

  for (const item of KNOWLEDGE_BASE) {
    let score = 0;

    if (preferredUnit && item.unit === preferredUnit) score += 10;
    if (q.includes(normalizeText(item.topic))) score += 15;
    score += keywordScore(q, item.keywords);

    for (const storedQuestion of item.questions) {
      const sq = normalizeText(storedQuestion);
      if (q === sq) score += 100;
      else if (q.includes(sq) || sq.includes(q)) score += 40;
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore >= 18 ? best : null;
}

/* ============================== QUIZ BANK ============================== */

const QUIZ_BANK: Record<string, GeneratedQuestion[]> = {
  "Unit 1: Place Value": [
    {
      id: 1,
      question: "What is the value of 5 in 352?",
      options: ["5", "50", "500", "35"],
      correctAnswer: "50",
      topic: "Place Value",
      explanation: "5 is in the tens place, so its value is 50.",
    },
    {
      id: 2,
      question: "Which number is written in expanded form correctly?",
      options: ["406 = 40 + 6", "406 = 400 + 6", "406 = 400 + 60", "406 = 4 + 0 + 6"],
      correctAnswer: "406 = 400 + 6",
      topic: "Expanded Form",
      explanation: "406 has 4 hundreds, 0 tens, and 6 ones.",
    },
    {
      id: 3,
      question: "In 91, what digit is in the tens place?",
      options: ["9", "1", "0", "10"],
      correctAnswer: "9",
      topic: "Ones and Tens",
      explanation: "The left digit in 91 is 9 tens.",
    },
    {
      id: 4,
      question: "What number has 4 hundreds, 3 tens, and 2 ones?",
      options: ["342", "432", "423", "243"],
      correctAnswer: "432",
      topic: "Place Value",
      explanation: "4 hundreds + 3 tens + 2 ones = 432.",
    },
    {
      id: 5,
      question: "Which is the expanded form of 728?",
      options: ["700 + 20 + 8", "70 + 20 + 8", "700 + 2 + 8", "700 + 200 + 8"],
      correctAnswer: "700 + 20 + 8",
      topic: "Expanded Form",
      explanation: "7 hundreds, 2 tens, and 8 ones make 728.",
    },
    {
      id: 6,
      question: "What is the value of 8 in 184?",
      options: ["8", "80", "800", "18"],
      correctAnswer: "80",
      topic: "Place Value",
      explanation: "8 is in the tens place.",
    },
    {
      id: 7,
      question: "Which number is the smallest?",
      options: ["523", "352", "235", "325"],
      correctAnswer: "235",
      topic: "Comparing Numbers",
      explanation: "2 hundreds is less than 3 hundreds or 5 hundreds.",
    },
    {
      id: 8,
      question: "How many tens are in 64?",
      options: ["4", "6", "60", "64"],
      correctAnswer: "6",
      topic: "Ones and Tens",
      explanation: "64 has 6 tens and 4 ones.",
    },
    {
      id: 9,
      question: "What is standard form for 500 + 30 + 4?",
      options: ["534", "5034", "543", "504"],
      correctAnswer: "534",
      topic: "Standard Form",
      explanation: "5 hundreds, 3 tens, and 4 ones make 534.",
    },
    {
      id: 10,
      question: "In 6,402, what is the value of 4?",
      options: ["4", "40", "400", "4000"],
      correctAnswer: "400",
      topic: "Place Value",
      explanation: "4 is in the hundreds place.",
    },
  ],

  "Unit 2: Addition & Subtraction": [
    {
      id: 1,
      question: "What is 27 + 15?",
      options: ["32", "42", "52", "38"],
      correctAnswer: "42",
      topic: "Addition",
      explanation: "27 + 15 = 42.",
    },
    {
      id: 2,
      question: "What is 54 - 19?",
      options: ["35", "45", "25", "33"],
      correctAnswer: "35",
      topic: "Subtraction",
      explanation: "Regroup first: 14 - 9 = 5 and 4 tens become 3 tens.",
    },
    {
      id: 3,
      question: "Which word means the answer to an addition problem?",
      options: ["Difference", "Product", "Sum", "Quotient"],
      correctAnswer: "Sum",
      topic: "Addition Vocabulary",
      explanation: "The answer to an addition problem is called the sum.",
    },
    {
      id: 4,
      question: "What is 63 - 21?",
      options: ["42", "31", "52", "41"],
      correctAnswer: "42",
      topic: "Subtraction",
      explanation: "Subtract ones, then tens.",
    },
    {
      id: 5,
      question: "What is 38 + 24?",
      options: ["52", "62", "64", "58"],
      correctAnswer: "62",
      topic: "Addition",
      explanation: "8 + 4 = 12, write 2 and carry 1.",
    },
    {
      id: 6,
      question: "Why do we regroup in subtraction?",
      options: [
        "To make the number larger",
        "Because a place does not have enough to subtract",
        "To change subtraction into multiplication",
        "To skip a step",
      ],
      correctAnswer: "Because a place does not have enough to subtract",
      topic: "Regrouping",
      explanation: "Regrouping helps when the top digit is smaller than the bottom digit.",
    },
    {
      id: 7,
      question: "What is 72 + 9?",
      options: ["79", "81", "82", "71"],
      correctAnswer: "81",
      topic: "Addition",
      explanation: "72 + 9 = 81.",
    },
    {
      id: 8,
      question: "What is 90 - 36?",
      options: ["64", "54", "56", "44"],
      correctAnswer: "54",
      topic: "Subtraction",
      explanation: "Regroup 90 as 8 tens and 10 ones.",
    },
    {
      id: 9,
      question: "What is the difference of 100 and 48?",
      options: ["42", "48", "52", "58"],
      correctAnswer: "52",
      topic: "Subtraction Vocabulary",
      explanation: "Difference means the answer to a subtraction problem.",
    },
    {
      id: 10,
      question: "What is 46 + 37?",
      options: ["73", "83", "93", "74"],
      correctAnswer: "83",
      topic: "Addition",
      explanation: "6 + 7 = 13, then 4 + 3 + 1 = 8.",
    },
  ],

  "Unit 3: Multiplication": [
    {
      id: 1,
      question: "What is 3 × 4?",
      options: ["7", "12", "10", "14"],
      correctAnswer: "12",
      topic: "Multiplication",
      explanation: "3 groups of 4 = 12.",
    },
    {
      id: 2,
      question: "Which repeated addition matches 2 × 5?",
      options: ["2 + 2 + 2 + 2 + 2", "5 + 5", "2 + 5", "10 + 5"],
      correctAnswer: "5 + 5",
      topic: "Multiplication Concepts",
      explanation: "2 × 5 means 2 groups of 5.",
    },
    {
      id: 3,
      question: "What is 6 × 7?",
      options: ["42", "36", "48", "56"],
      correctAnswer: "42",
      topic: "Facts",
      explanation: "6 times 7 = 42.",
    },
    {
      id: 4,
      question: "What is 13 × 4 using partial products?",
      options: ["42", "48", "52", "56"],
      correctAnswer: "52",
      topic: "Partial Products",
      explanation: "10 × 4 = 40 and 3 × 4 = 12, then 40 + 12 = 52.",
    },
    {
      id: 5,
      question: "Which shows 4 groups of 3?",
      options: ["4 + 4 + 4", "3 + 3 + 3 + 3", "4 + 3", "12 + 3"],
      correctAnswer: "3 + 3 + 3 + 3",
      topic: "Equal Groups",
      explanation: "4 groups of 3 means add 3 four times.",
    },
    {
      id: 6,
      question: "What is 8 × 5?",
      options: ["35", "40", "45", "30"],
      correctAnswer: "40",
      topic: "Facts",
      explanation: "8 times 5 = 40.",
    },
    {
      id: 7,
      question: "What is 21 × 3?",
      options: ["63", "42", "72", "53"],
      correctAnswer: "63",
      topic: "Two-Digit Multiplication",
      explanation: "20 × 3 = 60 and 1 × 3 = 3, then add.",
    },
    {
      id: 8,
      question: "What does an area model help you do?",
      options: [
        "Guess the answer",
        "Split numbers into parts to multiply",
        "Turn multiplication into division",
        "Count backwards",
      ],
      correctAnswer: "Split numbers into parts to multiply",
      topic: "Area Models",
      explanation: "Area models break numbers into easy parts.",
    },
    {
      id: 9,
      question: "What is 9 × 2?",
      options: ["11", "18", "16", "20"],
      correctAnswer: "18",
      topic: "Facts",
      explanation: "9 groups of 2 = 18.",
    },
    {
      id: 10,
      question: "What is 12 × 6?",
      options: ["62", "72", "66", "82"],
      correctAnswer: "72",
      topic: "Two-Digit Multiplication",
      explanation: "10 × 6 = 60 and 2 × 6 = 12, total 72.",
    },
  ],

  "Unit 4: Division": [
    {
      id: 1,
      question: "What is 12 ÷ 3?",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
      topic: "Division",
      explanation: "12 split into 3 equal groups gives 4 in each group.",
    },
    {
      id: 2,
      question: "What is the quotient in 20 ÷ 5?",
      options: ["20", "5", "4", "25"],
      correctAnswer: "4",
      topic: "Quotient",
      explanation: "The quotient is the answer to the division problem.",
    },
    {
      id: 3,
      question: "What is 15 ÷ 4?",
      options: ["2 R3", "3 R3", "4 R3", "5 R1"],
      correctAnswer: "3 R3",
      topic: "Remainders",
      explanation: "4 goes into 15 three times, with 3 left over.",
    },
    {
      id: 4,
      question: "Which multiplication fact helps solve 18 ÷ 6?",
      options: ["6 × 2 = 12", "6 × 3 = 18", "3 × 3 = 9", "6 × 4 = 24"],
      correctAnswer: "6 × 3 = 18",
      topic: "Fact Families",
      explanation: "Division and multiplication are related.",
    },
    {
      id: 5,
      question: "What is 24 ÷ 6?",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
      topic: "Division",
      explanation: "24 shared into 6 equal groups gives 4 each.",
    },
    {
      id: 6,
      question: "What does the remainder mean?",
      options: [
        "The biggest group",
        "The number left over",
        "The divisor",
        "The quotient",
      ],
      correctAnswer: "The number left over",
      topic: "Remainders",
      explanation: "A remainder is the part that cannot be shared equally.",
    },
    {
      id: 7,
      question: "What is 21 ÷ 7?",
      options: ["2", "3", "4", "7"],
      correctAnswer: "3",
      topic: "Division Facts",
      explanation: "21 split into 7 equal groups gives 3.",
    },
    {
      id: 8,
      question: "If 20 cookies are shared equally by 5 children, how many does each child get?",
      options: ["2", "3", "4", "5"],
      correctAnswer: "4",
      topic: "Word Problems",
      explanation: "20 ÷ 5 = 4.",
    },
    {
      id: 9,
      question: "What is 17 ÷ 5?",
      options: ["2 R2", "3 R2", "4 R1", "5 R2"],
      correctAnswer: "3 R2",
      topic: "Remainders",
      explanation: "5 goes into 17 three times, with 2 left over.",
    },
    {
      id: 10,
      question: "Which symbol means division?",
      options: ["+", "×", "÷", "-"],
      correctAnswer: "÷",
      topic: "Division Vocabulary",
      explanation: "The division sign is ÷.",
    },
  ],
};

/* ============================== FLASHCARD BANK ============================== */

const FLASHCARD_BANK: Record<string, GeneratedFlashcard[]> = {
  "Unit 1: Place Value": [
    { id: 1, front: "What is place value?", back: "The value of a digit based on its position in a number.", topic: "Place Value" },
    { id: 2, front: "What does the ones place show?", back: "Single units.", topic: "Ones and Tens" },
    { id: 3, front: "What does the tens place show?", back: "Groups of ten.", topic: "Ones and Tens" },
    { id: 4, front: "What is the value of 7 in 274?", back: "70", topic: "Place Value" },
    { id: 5, front: "Write 503 in expanded form.", back: "500 + 3", topic: "Expanded Form" },
    { id: 6, front: "Write 400 + 20 + 6 in standard form.", back: "426", topic: "Standard Form" },
    { id: 7, front: "In 845, what is the value of 8?", back: "800", topic: "Place Value" },
    { id: 8, front: "How many tens are in 63?", back: "6 tens", topic: "Ones and Tens" },
    { id: 9, front: "What number has 3 hundreds, 5 tens, and 1 one?", back: "351", topic: "Place Value" },
    { id: 10, front: "What is expanded form used for?", back: "To show the value of each digit.", topic: "Expanded Form" },
  ],

  "Unit 2: Addition & Subtraction": [
    { id: 1, front: "What is addition?", back: "Putting numbers together to find the total.", topic: "Addition" },
    { id: 2, front: "What is subtraction?", back: "Taking one amount away from another.", topic: "Subtraction" },
    { id: 3, front: "What is the sum?", back: "The answer to an addition problem.", topic: "Vocabulary" },
    { id: 4, front: "What is the difference?", back: "The answer to a subtraction problem.", topic: "Vocabulary" },
    { id: 5, front: "What is regrouping?", back: "Moving value from one place to another when needed.", topic: "Regrouping" },
    { id: 6, front: "Solve 34 + 28.", back: "62", topic: "Addition" },
    { id: 7, front: "Solve 61 - 17.", back: "44", topic: "Subtraction" },
    { id: 8, front: "Why do we carry in addition?", back: "Because 10 ones become 1 ten.", topic: "Regrouping" },
    { id: 9, front: "Why do we borrow in subtraction?", back: "Because a place does not have enough to subtract.", topic: "Regrouping" },
    { id: 10, front: "What should you line up before adding or subtracting?", back: "The place values.", topic: "Strategy" },
  ],

  "Unit 3: Multiplication": [
    { id: 1, front: "What is multiplication?", back: "Repeated addition or equal groups.", topic: "Multiplication" },
    { id: 2, front: "What does 3 × 4 mean?", back: "3 groups of 4.", topic: "Equal Groups" },
    { id: 3, front: "What is 6 × 5?", back: "30", topic: "Facts" },
    { id: 4, front: "What is an area model?", back: "A way to split numbers into parts to multiply.", topic: "Area Models" },
    { id: 5, front: "What are partial products?", back: "Small multiplication answers added together.", topic: "Partial Products" },
    { id: 6, front: "Solve 14 × 3.", back: "42", topic: "Two-Digit Multiplication" },
    { id: 7, front: "Solve 8 × 7.", back: "56", topic: "Facts" },
    { id: 8, front: "Which is repeated addition for 4 × 2?", back: "2 + 2 + 2 + 2", topic: "Equal Groups" },
    { id: 9, front: "What is 20 × 4?", back: "80", topic: "Multiplication" },
    { id: 10, front: "What do you do after finding partial products?", back: "Add them.", topic: "Partial Products" },
  ],

  "Unit 4: Division": [
    { id: 1, front: "What is division?", back: "Splitting a total into equal groups.", topic: "Division" },
    { id: 2, front: "What is the quotient?", back: "The answer to a division problem.", topic: "Quotient" },
    { id: 3, front: "What is a remainder?", back: "The number left over.", topic: "Remainder" },
    { id: 4, front: "Solve 16 ÷ 4.", back: "4", topic: "Division Facts" },
    { id: 5, front: "Solve 18 ÷ 5.", back: "3 remainder 3", topic: "Remainders" },
    { id: 6, front: "What does equal sharing mean?", back: "Each group gets the same amount.", topic: "Division" },
    { id: 7, front: "Which multiplication fact helps with 24 ÷ 6?", back: "6 × 4 = 24", topic: "Fact Families" },
    { id: 8, front: "Solve 21 ÷ 3.", back: "7", topic: "Division Facts" },
    { id: 9, front: "What does the divisor tell you?", back: "How many groups or what number you divide by.", topic: "Vocabulary" },
    { id: 10, front: "How do you check division?", back: "Multiply the quotient by the divisor and add the remainder if there is one.", topic: "Checking Work" },
  ],
};

/* ============================== LIBRARY API ============================== */

export async function generateQuizFromTranscript(
  transcript: string,
  unit?: string,
  topicLabel?: string
): Promise<GeneratedQuestion[]> {
  const targetUnit = detectRequestedUnit(unit, transcript, topicLabel);
  const bank = QUIZ_BANK[targetUnit] ?? QUIZ_BANK["Unit 1: Place Value"];
  return cloneQuestions(bank);
}

export async function generateFlashcardsFromTranscript(
  transcript: string,
  unit?: string
): Promise<GeneratedFlashcard[]> {
  const targetUnit = detectRequestedUnit(unit, transcript);
  const bank = FLASHCARD_BANK[targetUnit] ?? FLASHCARD_BANK["Unit 1: Place Value"];
  return cloneFlashcards(bank);
}

/* ============================== QUIZ HELP PROMPT BUILDER ============================== */

export function buildQuizHelpPrompt({
  question,
  userAnswer,
  correctAnswer,
}: {
  question: string;
  userAnswer: string;
  correctAnswer: string;
}): string {
  const isCorrect =
    userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  return `${SYSTEM_PROMPT}

---

You are now helping a student who just answered a quiz question. Follow the format below exactly.

Rules:
- Do not repeat the full question
- Do not repeat "Student answer" or "Correct answer"
- Do not copy the input
- Do not add unrelated examples
- Use very easy words
- Use short sentences
- Use exactly 3 steps
- End with one final answer line
- Keep the response neat and well spaced
- If the student is correct, praise gently
- If the student is wrong, correct gently and clearly

Return in exactly this format:

${isCorrect ? "✅ Good job! Your answer is correct." : "🌟 Nice try! Let's solve it together."}

Step 1: ...
Step 2: ...
Step 3: ...

Final Answer: ...

Question: ${question}
Student answer: ${userAnswer}
Correct answer: ${correctAnswer}`;
}

/* ============================== TUTOR REPLY FORMATTER ============================== */

export function formatTutorReply(raw: string): string {
  let text = (raw || "").trim();

  text = text
    .replace(/<\|.*?\|>/g, "")
    .replace(/question\s*:.*$/gim, "")
    .replace(/student answer\s*:.*$/gim, "")
    .replace(/my answer\s*:.*$/gim, "")
    .replace(/correct answer\s*:.*$/gim, "")
    .replace(/please explain.*$/gim, "")
    .replace(/let['']s do it step by step\.?/gi, "")
    .replace(/here['']s.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (!seen.has(normalized)) {
      deduped.push(line);
      seen.add(normalized);
    }
  }

  const hasIntro = /good job|nice try|let.?s solve it together/i.test(
    deduped.join("\n")
  );
  const hasStep1 = /step 1:/i.test(text);
  const hasStep2 = /step 2:/i.test(text);
  const hasStep3 = /step 3:/i.test(text);
  const hasFinal = /final answer:/i.test(text);

  // Re-assemble with proper blank lines between each section
  const sections: string[] = [];
  let currentBlock: string[] = [];

  for (const line of deduped) {
    const isStep = /^step \d+:/i.test(line);
    const isFinal = /^final answer:/i.test(line);
    const isIntroLine =
      /good job|nice try|let.?s solve it together/i.test(line);

    if ((isStep || isFinal) && currentBlock.length > 0) {
      sections.push(currentBlock.join("\n"));
      currentBlock = [];
    }
    currentBlock.push(line);
  }
  if (currentBlock.length > 0) sections.push(currentBlock.join("\n"));

  let result = sections.join("\n\n");

  if (!hasIntro) {
    result = `🌟 Let's solve it step by step.\n\n${result}`.trim();
  }

  if (!hasStep1 && !hasStep2 && !hasStep3) {
    const chunks = deduped
      .filter((l) => !/good job|nice try|let.?s solve it together/i.test(l))
      .filter((l) => !/final answer:/i.test(l));

    if (chunks.length >= 3) {
      const introLine = hasIntro
        ? sections[0] + "\n\n"
        : "🌟 Let's solve it step by step.\n\n";
      result =
        `${introLine}` +
        `Step 1: ${chunks[0]}\n\n` +
        `Step 2: ${chunks[1]}\n\n` +
        `Step 3: ${chunks[2]}`;
    }
  }

  if (!hasFinal) {
    const lastMeaningfulLine =
      [...deduped].reverse().find((line) => /\d/.test(line)) || "";
    const extractedAnswer =
      lastMeaningfulLine.match(/\b[\dR\s]+\b/g)?.slice(-1)[0]?.trim() || "";
    if (extractedAnswer) {
      result = `${result}\n\nFinal Answer: ${extractedAnswer}`.trim();
    }
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

/* ============================== QUIZ HELP ENTRY POINT ============================== */

export function generateQuizHelp({
  question,
  userAnswer,
  correctAnswer,
}: {
  question: string;
  userAnswer: string;
  correctAnswer: string;
}): string {
  const isCorrect =
    userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  const intro = isCorrect
    ? "✅ Good job! Your answer is correct."
    : "🌟 Nice try! Let's solve it together.";

  // Build a deterministic tutor reply using the knowledge base
  const preferredUnit = inferUnitFromText(question);
  const knowledge = lookupKnowledge(question, preferredUnit);

  const step1 = knowledge?.answer
    ? knowledge.answer
    : "Read the question carefully and think about the math idea.";

  const step2 = knowledge?.example
    ? knowledge.example
    : isCorrect
    ? `Your answer of ${userAnswer} is right.`
    : `The correct answer is ${correctAnswer}.`;

  const step3 = knowledge?.hint
    ? knowledge.hint
    : isCorrect
    ? "Keep up the great work!"
    : `Remember: ${correctAnswer} is the answer.`;

  const raw = [
    intro,
    "",
    `Step 1: ${step1}`,
    "",
    `Step 2: ${step2}`,
    "",
    `Step 3: ${step3}`,
    "",
    `Final Answer: ${correctAnswer}`,
  ].join("\n");

  return formatTutorReply(raw);
}

/* ============================== SPECIAL EXPLANATION MODE ============================== */

function extractLabeledValue(input: string, label: string): string {
  const regex = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, "i");
  return normalizeSpace(input.match(regex)?.[1] ?? "");
}

function explainQuizStylePrompt(input: string): string | null {
  const q = extractLabeledValue(input, "Question");
  const userAnswer = extractLabeledValue(input, "My answer");
  const correctAnswer = extractLabeledValue(input, "Correct answer");

  if (!q) return null;

  return generateQuizHelp({ question: q, userAnswer, correctAnswer });
}

/* ============================== CHAT ROUTER ============================== */

const GREETINGS = new Set(["hi", "hello", "hey", "hii", "helo"]);

function buildFallbackAnswer(userText: string, preferredUnit?: string | null): string {
  const unit = preferredUnit || inferUnitFromText(userText);

  if (unit) {
    return [
      `I do not have that exact answer yet, but I can help with this unit.`,
      ``,
      getReadableLessonSummary(unit),
      ``,
      `Try asking about: ${getLessonInfoByUnit(unit)
        .map((lesson) => lesson.topic)
        .join(", ")}.`,
    ].join("\n");
  }

  return `I do not have that exact answer yet. Try asking about place value, addition, subtraction, multiplication, or division.`;
}

export async function callAI(history: Message[]): Promise<Message> {
  try {
    setState("ready");

    // Prepend system prompt if not already present
    const hasSystemMessage = history.some((m) => m.role === "system");
    const fullHistory: Message[] = hasSystemMessage
      ? history
      : [
          {
            id: "system-0",
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...history,
        ];

    const lastUser = [...fullHistory].reverse().find((m) => m.role === "user");
    const userText = normalizeSpace(lastUser?.content ?? "");

    if (!userText) {
      return makeAssistantMessage("Please ask a math question and I'll help.");
    }

    const normalized = normalizeText(userText);

    if (GREETINGS.has(normalized)) {
      return makeAssistantMessage(
        "Hi! I'm your Offklass Buddy. Ask me about place value, addition, subtraction, multiplication, or division."
      );
    }

    // ── Context follow-up handler ────────────────────────────────────────────
    // Broad pattern — no word-count cap. Covers: explain, example, solve with
    // me, practice, try again, confused, walk me through, etc.
    const FOLLOWUP_PATTERN =
      /explain|step by step|show me|show an example|give me an example|solve it with me|solve with me|work it out|walk me through|why(?: is| was| did)?|how come|i don.?t understand|can you explain|tell me more|in detail|more detail|practice|try again|another example|one more|do it again|help me understand|break it down|make it simple|i.?m confused|confused|stuck|not sure|what does that mean/i;

    if (FOLLOWUP_PATTERN.test(userText)) {
      // Walk back through history to find the last quiz question block
      const prevQuizMsg = [...fullHistory]
        .reverse()
        .find(
          (m) =>
            m.role === "user" &&
            /question\s*:/i.test(m.content) &&
            /correct answer\s*:/i.test(m.content)
        );

      if (prevQuizMsg) {
        const q = extractLabeledValue(prevQuizMsg.content, "Question");
        const userAns = extractLabeledValue(prevQuizMsg.content, "My answer");
        const correctAns = extractLabeledValue(
          prevQuizMsg.content,
          "Correct answer"
        );

        if (q) {
          // "show me an example" / "solve with me" / "practice" — worked example
          const isExampleRequest =
            /example|solve it with me|solve with me|practice|try again|another|one more|do it again|work it out|walk me through/i.test(
              userText
            );

          if (isExampleRequest) {
            const unit = inferUnitFromText(q) || "Unit 1: Place Value";
            const bank = QUIZ_BANK[unit] ?? [];
            const origTopic = bank.find((x) => x.question === q)?.topic ?? "";
            const similar =
              bank.find((bq) => bq.question !== q && bq.topic === origTopic) ??
              bank.find((bq) => bq.question !== q) ??
              bank[0];

            if (similar) {
              const worked = [
                `Sure! Let\'s try a similar one together. 😊`,
                ``,
                `Question: ${similar.question}`,
                ``,
                `Step 1: Read the question carefully.`,
                `Step 2: ${similar.explanation}`,
                `Step 3: Check — does the answer make sense?`,
                ``,
                `Answer: ${similar.correctAnswer}`,
                ``,
                `Now go back to your quiz and use the same idea. You got this! 🌟`,
              ].join("\n");
              return makeAssistantMessage(worked);
            }
          }

          // Default: re-explain the original question
          return makeAssistantMessage(
            generateQuizHelp({ question: q, userAnswer: userAns, correctAnswer: correctAns })
          );
        }
      }
      // No prior quiz context — fall through to API so it still gets answered
    }
    // ────────────────────────────────────────────────────────────────────────

    const specialExplain = explainQuizStylePrompt(userText);
    if (specialExplain) {
      return makeAssistantMessage(specialExplain);
    }

    const mathAnswer = tryMathFallback(userText);
    if (mathAnswer) {
      return makeAssistantMessage(mathAnswer);
    }

    if (
      normalized.includes("what are we learning") ||
      normalized.includes("what is this unit about") ||
      normalized.includes("what topics are in this unit")
    ) {
      const unit = inferUnitFromText(userText) || "Unit 1: Place Value";
      return makeAssistantMessage(getReadableLessonSummary(unit));
    }

    const preferredUnit = inferUnitFromText(userText);
    const knowledge = lookupKnowledge(userText, preferredUnit);

    if (knowledge) {
      return makeAssistantMessage(formatKnowledgeAnswer(knowledge));
    }

    if (preferredUnit) {
      const lessonTopics = getLessonInfoByUnit(preferredUnit)
        .map((lesson) => lesson.topic)
        .filter(Boolean);

      if (lessonTopics.length) {
        return makeAssistantMessage(
          [
            getReadableLessonSummary(preferredUnit),
            "",
            `You can ask me about: ${lessonTopics.join(", ")}.`,
          ].join("\n")
        );
      }
    }

    // ── Live AI fallback via Anthropic API ───────────────────────────────────
    // Reaches here when the question isn't in the local knowledge base.
    // Sends the full conversation history + system prompt to Claude so the
    // student always gets a real, child-friendly answer.
    try {
      const apiMessages = fullHistory
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);

      const data = await response.json();
      const aiText =
        data?.content
          ?.filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n")
          .trim() || "";

      if (aiText) return makeAssistantMessage(aiText);
    } catch {
      // API unavailable — fall through to offline nudge
    }
    // ────────────────────────────────────────────────────────────────────────

    return makeAssistantMessage(
      "I am not sure about that one. Try asking me about place value, addition, subtraction, multiplication, or division and I will help!"
    );
  } catch (e: any) {
    setState("error", String(e?.message ?? e));
    return makeAssistantMessage(
      "Something went wrong. Please try asking your question again."
    );
  }
}