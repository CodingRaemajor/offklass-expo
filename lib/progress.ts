// lib/progress.ts
// Simple progress + streak + daily activity tracking for Offklass.

import { loadJSON, saveJSON } from "./storage";

const PROGRESS_KEY = "ok:progress:v1";

export type DaySummary = {
  date: string;                 // YYYY-MM-DD (Regina)
  lessonsWatched: number;
  lastLessonTitle?: string;
  quizzesTaken: number;
  quizQuestions: number;
  flashSessions: number;
  flashcardsReviewed: number;
};

type ProgressState = {
  lastActiveDate: string | null; // YYYY-MM-DD in Regina
  streak: number;
  level: number;
  points: number;
  days: DaySummary[];            // newest first, keep last ~7 days
};

const defaultState: ProgressState = {
  lastActiveDate: null,
  streak: 0,
  level: 1,
  points: 0,
  days: [],
};

// --- Time helpers (Regina) ---

const REGINA_TZ = "America/Regina";

function todayInRegina(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: REGINA_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value ?? "1970";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`; // YYYY-MM-DD
  } catch {
    // Fallback: device local date
    return new Date().toISOString().slice(0, 10);
  }
}

function diffDays(a: string, b: string): number {
  const aDate = new Date(`${a}T00:00:00-06:00`);
  const bDate = new Date(`${b}T00:00:00-06:00`);
  const ms = bDate.getTime() - aDate.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// --- Core helpers ---

function updateStreak(state: ProgressState, today: string): ProgressState {
  if (!state.lastActiveDate) {
    return { ...state, lastActiveDate: today, streak: 1 };
  }

  const delta = diffDays(state.lastActiveDate, today);

  if (delta <= 0) {
    // same day or somehow in the past: keep streak, but update date if different
    return { ...state, lastActiveDate: today };
  }
  if (delta === 1) {
    // consecutive day
    return {
      ...state,
      lastActiveDate: today,
      streak: state.streak + 1,
    };
  }
  // broke streak
  return {
    ...state,
    lastActiveDate: today,
    streak: 1,
  };
}

function recalcLevel(points: number): number {
  // simple rule: every 100 points -> +1 level
  return 1 + Math.floor(points / 100);
}

function upsertToday(
  state: ProgressState,
  today: string,
): { state: ProgressState; day: DaySummary } {
  const existingIndex = state.days.findIndex((d) => d.date === today);
  let day: DaySummary;

  if (existingIndex === -1) {
    day = {
      date: today,
      lessonsWatched: 0,
      quizzesTaken: 0,
      quizQuestions: 0,
      flashSessions: 0,
      flashcardsReviewed: 0,
    };
    const days = [day, ...state.days].slice(0, 7); // keep last 7 days
    return { state: { ...state, days }, day };
  }

  day = state.days[existingIndex];
  const days = [...state.days];
  days[existingIndex] = day;
  return { state: { ...state, days }, day };
}

// --- Public API for Home screen ---

export type HomeSnapshot = {
  streak: number;
  level: number;
  todaySummary: DaySummary | null;
};

export async function getHomeSnapshot(): Promise<HomeSnapshot> {
  const today = todayInRegina();
  let state = await loadJSON<ProgressState>(PROGRESS_KEY, defaultState);

  state = updateStreak(state, today);
  await saveJSON(PROGRESS_KEY, state);

  const todaySummary = state.days.find((d) => d.date === today) ?? null;

  return {
    streak: state.streak,
    level: state.level,
    todaySummary,
  };
}

// --- Logging helpers for lessons / quizzes / flashcards ---

export async function recordLessonWatched(
  lessonId: string,
  lessonTitle: string,
) {
  const today = todayInRegina();
  let state = await loadJSON<ProgressState>(PROGRESS_KEY, defaultState);
  state = updateStreak(state, today);

  let { state: newState, day } = upsertToday(state, today);
  day = {
    ...day,
    lessonsWatched: day.lessonsWatched + 1,
    lastLessonTitle: lessonTitle || day.lastLessonTitle,
  };

  // replace updated day back into array
  newState.days = [day, ...newState.days.filter((d) => d.date !== today)];

  // simple points: +5 per lesson
  newState.points += 5;
  newState.level = recalcLevel(newState.points);

  await saveJSON(PROGRESS_KEY, newState);
}

export async function recordQuizAttempt(
  lessonId: string,
  numQuestions: number,
) {
  const today = todayInRegina();
  let state = await loadJSON<ProgressState>(PROGRESS_KEY, defaultState);
  state = updateStreak(state, today);

  let { state: newState, day } = upsertToday(state, today);
  day = {
    ...day,
    quizzesTaken: day.quizzesTaken + 1,
    quizQuestions: day.quizQuestions + (numQuestions || 0),
  };
  newState.days = [day, ...newState.days.filter((d) => d.date !== today)];

  // simple points: +2 per quiz, +1 per 5 questions
  newState.points += 2 + Math.floor((numQuestions || 0) / 5);
  newState.level = recalcLevel(newState.points);

  await saveJSON(PROGRESS_KEY, newState);
}

export async function recordFlashcardsSession(
  lessonId: string,
  numCards: number,
) {
  const today = todayInRegina();
  let state = await loadJSON<ProgressState>(PROGRESS_KEY, defaultState);
  state = updateStreak(state, today);

  let { state: newState, day } = upsertToday(state, today);
  day = {
    ...day,
    flashSessions: day.flashSessions + 1,
    flashcardsReviewed: day.flashcardsReviewed + (numCards || 0),
  };
  newState.days = [day, ...newState.days.filter((d) => d.date !== today)];

  // simple points: +1 per 10 cards
  newState.points += Math.floor((numCards || 0) / 10);
  newState.level = recalcLevel(newState.points);

  await saveJSON(PROGRESS_KEY, newState);
}