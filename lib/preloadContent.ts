// lib/preloadContent.ts

import {
  LESSON_INFO,
  getCombinedTranscriptByUnit,
  getLessonsForUnit,
  getQuizTitleByUnit,
  getQuizTopicByUnit,
} from "./lessonTranscripts";
import { getQuizBankByUnit } from "./quizBank";
import { getFlashcardsBankByUnit } from "./flashcardsBank";

export interface UnitPreloadContent {
  unit: string;
  title: string;
  topicSummary: string;
  lessonCount: number;
  lessonIds: string[];
  lessonTitles: string[];
  combinedTranscript: string;
  fallbackQuiz: ReturnType<typeof getQuizBankByUnit>;
  fallbackFlashcards: ReturnType<typeof getFlashcardsBankByUnit>;
}

export const ALL_UNITS = Array.from(new Set(LESSON_INFO.map((lesson) => lesson.unit)));

export const PRELOAD_CONTENT: Record<string, UnitPreloadContent> = ALL_UNITS.reduce(
  (acc, unit) => {
    const lessons = getLessonsForUnit(unit);

    acc[unit] = {
      unit,
      title: getQuizTitleByUnit(unit),
      topicSummary: getQuizTopicByUnit(unit),
      lessonCount: lessons.length,
      lessonIds: lessons.map((lesson) => lesson.lessonId),
      lessonTitles: lessons.map((lesson) => lesson.title),
      combinedTranscript: getCombinedTranscriptByUnit(unit),
      fallbackQuiz: getQuizBankByUnit(unit),
      fallbackFlashcards: getFlashcardsBankByUnit(unit),
    };

    return acc;
  },
  {} as Record<string, UnitPreloadContent>
);

export function getPreloadContentByUnit(unit: string): UnitPreloadContent | null {
  return PRELOAD_CONTENT[unit] ?? null;
}

export function getAllPreloadUnits(): string[] {
  return ALL_UNITS;
}

export function warmAllUnitContent() {
  return ALL_UNITS.map((unit) => PRELOAD_CONTENT[unit]);
}