// lib/quizBank.ts

import { getAllUnits } from "./lessonTranscripts";

/* ============================== TYPES ============================== */

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  unit: string;
}

/* ============================== QUIZ DATA ============================== */

export const QUIZ_BANK: QuizQuestion[] = [
  /* ================= UNIT 1 ================= */
  {
    id: 1,
    unit: "Unit 1: Place Value",
    question: "What is the value of 5 in 352?",
    options: ["5", "50", "500", "35"],
    correctAnswer: "50",
    explanation: "5 is in the tens place, so its value is 50.",
  },
  {
    id: 2,
    unit: "Unit 1: Place Value",
    question: "Write 482 in expanded form.",
    options: ["400 + 80 + 2", "40 + 80 + 2", "400 + 8 + 2", "480 + 2"],
    correctAnswer: "400 + 80 + 2",
    explanation: "Each digit is written based on its place value.",
  },
  {
    id: 3,
    unit: "Unit 1: Place Value",
    question: "Which place is the digit 7 in 47?",
    options: ["Ones", "Tens", "Hundreds", "Thousands"],
    correctAnswer: "Ones",
    explanation: "The rightmost digit is always the ones place.",
  },
  {
    id: 4,
    unit: "Unit 1: Place Value",
    question: "What does the 3 represent in 300?",
    options: ["3", "30", "300", "3000"],
    correctAnswer: "300",
    explanation: "3 is in the hundreds place, so its value is 300.",
  },

  /* ================= UNIT 2 ================= */
  {
    id: 5,
    unit: "Unit 2: Addition & Subtraction",
    question: "What is 27 + 15?",
    options: ["32", "42", "41", "37"],
    correctAnswer: "42",
    explanation: "Add ones (7+5=12), carry 1, then add tens.",
  },
  {
    id: 6,
    unit: "Unit 2: Addition & Subtraction",
    question: "What is 52 - 19?",
    options: ["33", "31", "43", "29"],
    correctAnswer: "33",
    explanation: "Regroup 52 into 3 tens and 12 ones, then subtract.",
  },
  {
    id: 7,
    unit: "Unit 2: Addition & Subtraction",
    question: "What does regrouping mean?",
    options: [
      "Changing numbers randomly",
      "Moving value between places",
      "Adding without thinking",
      "Guessing answers",
    ],
    correctAnswer: "Moving value between places",
    explanation: "Regrouping shifts value from tens to ones or vice versa.",
  },
  {
    id: 8,
    unit: "Unit 2: Addition & Subtraction",
    question: "What is 34 + 28?",
    options: ["52", "62", "60", "58"],
    correctAnswer: "62",
    explanation: "Add ones (4+8=12), carry 1, then add tens.",
  },

  /* ================= UNIT 3 ================= */
  {
    id: 9,
    unit: "Unit 3: Multiplication",
    question: "What is 3 × 4?",
    options: ["7", "12", "9", "8"],
    correctAnswer: "12",
    explanation: "3 groups of 4 equals 12.",
  },
  {
    id: 10,
    unit: "Unit 3: Multiplication",
    question: "What does multiplication represent?",
    options: [
      "Repeated addition",
      "Random numbers",
      "Subtraction",
      "Division only",
    ],
    correctAnswer: "Repeated addition",
    explanation: "Multiplication is adding equal groups.",
  },
  {
    id: 11,
    unit: "Unit 3: Multiplication",
    question: "What is 13 × 4 using partial products?",
    options: ["52", "48", "40", "56"],
    correctAnswer: "52",
    explanation: "13 = 10 + 3 → (10×4)+(3×4)=40+12=52.",
  },

  /* ================= UNIT 4 ================= */
  {
    id: 12,
    unit: "Unit 4: Division",
    question: "What is 12 ÷ 3?",
    options: ["4", "3", "6", "2"],
    correctAnswer: "4",
    explanation: "12 split into 3 equal groups gives 4 each.",
  },
  {
    id: 13,
    unit: "Unit 4: Division",
    question: "What is a quotient?",
    options: [
      "The remainder",
      "The answer to division",
      "A subtraction result",
      "A random number",
    ],
    correctAnswer: "The answer to division",
    explanation: "Quotient is the result of division.",
  },
  {
    id: 14,
    unit: "Unit 4: Division",
    question: "What is 14 ÷ 4?",
    options: [
      "3 remainder 2",
      "4 remainder 2",
      "2 remainder 3",
      "3 remainder 1",
    ],
    correctAnswer: "3 remainder 2",
    explanation: "4×3=12, remainder is 2.",
  },
];

/* ============================== GENERATOR ============================== */

export function getQuizByUnit(unit: string, count = 10): QuizQuestion[] {
  const filtered = QUIZ_BANK.filter((q) => q.unit === unit);

  if (!filtered.length) return [];

  // shuffle
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
}

/* ============================== HELPERS ============================== */

export function getAllQuizUnits(): string[] {
  return getAllUnits();
}