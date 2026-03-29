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

/* ----------------------------- Basic Helpers ----------------------------- */

export function getTranscriptByLessonId(
  lessonId: string
): LessonTranscript | undefined {
  return LESSON_INFO.find((t) => t.lessonId === lessonId);
}

export function getLessonInfoByUnit(unit: string): LessonTranscript[] {
  return LESSON_INFO.filter((t) => t.unit === unit);
}

/* ----------------------------- Quiz Helpers ----------------------------- */

/**
 * Returns all lessons inside a selected unit.
 * Example:
 * "Unit 3: Multiplication" -> [m3, m4]
 */
export function getLessonsForUnit(unit: string): LessonTranscript[] {
  return LESSON_INFO.filter((lesson) => lesson.unit === unit);
}

/**
 * Returns a single combined transcript string for the selected unit.
 * This is the safest helper for AI quiz generation.
 *
 * Example:
 * Unit 1 -> m1 transcript
 * Unit 2 -> m2 transcript
 * Unit 3 -> m3 + m4 transcript
 * Unit 4 -> m5 transcript
 */
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

/**
 * Returns a readable quiz title for the selected unit.
 */
export function getQuizTitleByUnit(unit: string): string {
  const lessons = getLessonsForUnit(unit);

  if (!lessons.length) return unit;

  if (lessons.length === 1) {
    return lessons[0].title;
  }

  return `${unit} Challenge`;
}

/**
 * Returns a readable topic summary for the selected unit.
 */
export function getQuizTopicByUnit(unit: string): string {
  const lessons = getLessonsForUnit(unit);

  if (!lessons.length) return unit;

  return lessons.map((lesson) => lesson.topic).join(", ");
}