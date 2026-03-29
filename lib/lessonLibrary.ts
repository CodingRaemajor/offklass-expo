// lib/lessonLibrary.ts

import {
  LESSON_INFO,
  getLessonsForUnit,
  getAllUnits,
} from "./lessonTranscripts";

import { KNOWLEDGE_BASE } from "./knowledgeBase";
import { QUIZ_BANK } from "./quizBank";

/* ============================== TYPES ============================== */

export interface UnitBundle {
  unit: string;
  lessons: string[];
  topics: string[];
  knowledgeIds: string[];
  quizIds: number[];
  flashcardIds: number[];
}

/* ============================== CORE ============================== */

export function buildUnitBundle(unit: string): UnitBundle {
  const lessons = getLessonsForUnit(unit);

  const lessonIds = lessons.map((l) => l.lessonId);
  const topics = lessons.map((l) => l.topic);

  const knowledge = KNOWLEDGE_BASE.filter((k) => k.unit === unit);
  const quizzes = QUIZ_BANK.filter((q) => q.unit === unit);

  const knowledgeIds = knowledge.map((k) => k.id);
  const quizIds = quizzes.map((q) => q.id);

  // Optional mapping (if you later connect flashcards)
  const flashcardIds = knowledge
    .flatMap((k) => k.relatedFlashcardIds || [])
    .filter(Boolean);

  return {
    unit,
    lessons: lessonIds,
    topics,
    knowledgeIds,
    quizIds,
    flashcardIds,
  };
}

/* ============================== ALL UNITS ============================== */

export function getAllUnitBundles(): UnitBundle[] {
  return getAllUnits().map((unit) => buildUnitBundle(unit));
}

/* ============================== LOOKUPS ============================== */

export function getKnowledgeByUnit(unit: string) {
  return KNOWLEDGE_BASE.filter((k) => k.unit === unit);
}

export function getQuizzesByUnit(unit: string) {
  return QUIZ_BANK.filter((q) => q.unit === unit);
}

/* ============================== SMART HELPERS ============================== */

/**
 * Used by AI screen
 */
export function getUnitOverview(unit: string): string {
  const bundle = buildUnitBundle(unit);

  if (!bundle.lessons.length) {
    return "No content available.";
  }

  return (
    `📚 ${unit}\n\n` +
    `Lessons: ${bundle.lessons.length}\n` +
    `Topics: ${bundle.topics.join(", ")}\n\n` +
    `You can:\n` +
    `• Ask questions\n` +
    `• Take quizzes\n` +
    `• Practice flashcards`
  );
}

/**
 * Used for dashboard / home
 */
export function getProgressSummary(unit: string) {
  const bundle = buildUnitBundle(unit);

  return {
    totalLessons: bundle.lessons.length,
    totalQuizzes: bundle.quizIds.length,
    totalFlashcards: bundle.flashcardIds.length,
  };
}

/**
 * Used for recommendations
 */
export function getRecommendedUnits(): string[] {
  return getAllUnits();
}