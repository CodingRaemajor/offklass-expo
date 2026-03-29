// lib/lessonTranscripts.ts

import { m1Transcript } from "../assets/transcripts/m1";
import { m2Transcript } from "../assets/transcripts/m2";
import { m3Transcript } from "../assets/transcripts/m3";
import { m4Transcript } from "../assets/transcripts/m4";
import { m5Transcript } from "../assets/transcripts/m5";

export interface LessonTranscript {
  lessonId: string;
  title: string;
  unit: string;
  topic: string;
  transcript: string;
}

export const LESSON_INFO: LessonTranscript[] = [
  {
    lessonId: "m1",
    title: "Understanding Ones and Tens",
    unit: "Unit 1: Place Value",
    topic: "Place Value Basics",
    transcript: m1Transcript,
  },
  {
    lessonId: "m2",
    title: "Addition and Subtraction Basics",
    unit: "Unit 2: Addition & Subtraction",
    topic: "Regrouping and Place Value",
    transcript: m2Transcript,
  },
  {
    lessonId: "m3",
    title: "Multiplication Basics",
    unit: "Unit 3: Multiplication",
    topic: "Multiplication Concepts",
    transcript: m3Transcript,
  },
  {
    lessonId: "m4",
    title: "Multiplying Two-Digit Numbers",
    unit: "Unit 3: Multiplication",
    topic: "Area Models and Partial Products",
    transcript: m4Transcript,
  },
  {
    lessonId: "m5",
    title: "Division Basics",
    unit: "Unit 4: Division",
    topic: "Quotients, Remainders, and Word Problems",
    transcript: m5Transcript,
  },
];

/* ----------------------------- Normalizers ----------------------------- */

function normalizeText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s&:]/g, " ")
    .replace(/\s+/g, " ");
}

/* ----------------------------- Basic Helpers ----------------------------- */

export function getTranscriptByLessonId(
  lessonId: string
): LessonTranscript | undefined {
  return LESSON_INFO.find((lesson) => lesson.lessonId === lessonId);
}

export function getLessonInfoByUnit(unit: string): LessonTranscript[] {
  return LESSON_INFO.filter((lesson) => lesson.unit === unit);
}

export function getLessonsForUnit(unit: string): LessonTranscript[] {
  return LESSON_INFO.filter((lesson) => lesson.unit === unit);
}

export function getCombinedTranscriptByUnit(unit: string): string {
  const lessons = getLessonsForUnit(unit);

  if (!lessons.length) return "";

  return lessons
    .map(
      (lesson) =>
        `Lesson: ${lesson.title}\nTopic: ${lesson.topic}\n\n${lesson.transcript}`
    )
    .join("\n\n--------------------\n\n");
}

export function getQuizTitleByUnit(unit: string): string {
  const lessons = getLessonsForUnit(unit);

  if (!lessons.length) return unit;

  if (lessons.length === 1) {
    return lessons[0].title;
  }

  return `${unit} Challenge`;
}

export function getQuizTopicByUnit(unit: string): string {
  const lessons = getLessonsForUnit(unit);

  if (!lessons.length) return unit;

  return lessons.map((lesson) => lesson.topic).join(", ");
}

/* ----------------------------- New Helpers ----------------------------- */

export function getAllUnits(): string[] {
  return Array.from(new Set(LESSON_INFO.map((lesson) => lesson.unit))).filter(
    Boolean
  );
}

export function getAllTopics(): string[] {
  return Array.from(new Set(LESSON_INFO.map((lesson) => lesson.topic))).filter(
    Boolean
  );
}

export function getTopicsByUnit(unit: string): string[] {
  return LESSON_INFO.filter((lesson) => lesson.unit === unit)
    .map((lesson) => lesson.topic)
    .filter(Boolean);
}

export function getLessonTitlesByUnit(unit: string): string[] {
  return LESSON_INFO.filter((lesson) => lesson.unit === unit)
    .map((lesson) => lesson.title)
    .filter(Boolean);
}

export function getLessonIdsByUnit(unit: string): string[] {
  return LESSON_INFO.filter((lesson) => lesson.unit === unit)
    .map((lesson) => lesson.lessonId)
    .filter(Boolean);
}

export function getUnitByLessonId(lessonId: string): string | null {
  const lesson = getTranscriptByLessonId(lessonId);
  return lesson?.unit ?? null;
}

export function getTopicByLessonId(lessonId: string): string | null {
  const lesson = getTranscriptByLessonId(lessonId);
  return lesson?.topic ?? null;
}

export function getTitleByLessonId(lessonId: string): string | null {
  const lesson = getTranscriptByLessonId(lessonId);
  return lesson?.title ?? null;
}

export function unitExists(unit: string): boolean {
  return LESSON_INFO.some((lesson) => lesson.unit === unit);
}

export function topicExists(topic: string): boolean {
  return LESSON_INFO.some((lesson) => lesson.topic === topic);
}

/* ----------------------------- Search Helpers ----------------------------- */

export function findUnitByText(input: string): string | null {
  const q = normalizeText(input);

  for (const unit of getAllUnits()) {
    if (q.includes(normalizeText(unit))) {
      return unit;
    }
  }

  if (q.includes("place value") || q.includes("ones and tens")) {
    return "Unit 1: Place Value";
  }

  if (
    q.includes("addition") ||
    q.includes("subtraction") ||
    q.includes("regrouping")
  ) {
    return "Unit 2: Addition & Subtraction";
  }

  if (
    q.includes("multiplication") ||
    q.includes("multiply") ||
    q.includes("area model") ||
    q.includes("partial products")
  ) {
    return "Unit 3: Multiplication";
  }

  if (
    q.includes("division") ||
    q.includes("divide") ||
    q.includes("quotient") ||
    q.includes("remainder")
  ) {
    return "Unit 4: Division";
  }

  return null;
}

export function findTopicByText(input: string): string | null {
  const q = normalizeText(input);

  for (const topic of getAllTopics()) {
    if (q.includes(normalizeText(topic))) {
      return topic;
    }
  }

  if (q.includes("place value")) return "Place Value Basics";
  if (q.includes("regrouping")) return "Regrouping and Place Value";
  if (q.includes("multiplication")) return "Multiplication Concepts";
  if (q.includes("area model") || q.includes("partial products")) {
    return "Area Models and Partial Products";
  }
  if (
    q.includes("division") ||
    q.includes("quotient") ||
    q.includes("remainder")
  ) {
    return "Quotients, Remainders, and Word Problems";
  }

  return null;
}

/* ----------------------------- Summaries ----------------------------- */

export function getUnitSummary(unit: string): string {
  const lessons = getLessonsForUnit(unit);

  if (!lessons.length) {
    return unit;
  }

  const lessonTitles = lessons.map((lesson) => lesson.title).join(", ");
  const topics = lessons.map((lesson) => lesson.topic).join(", ");

  return `This unit includes: ${lessonTitles}. Main topics: ${topics}.`;
}

export function getLessonSummaryByLessonId(lessonId: string): string {
  const lesson = getTranscriptByLessonId(lessonId);

  if (!lesson) {
    return "Lesson not found.";
  }

  return `Lesson: ${lesson.title}. Unit: ${lesson.unit}. Topic: ${lesson.topic}.`;
}