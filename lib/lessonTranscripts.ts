// lib/lessonTranscripts.ts
import { m1Transcript } from '../assets/transcripts/m1';

export interface LessonTranscript {
  lessonId: string;
  title: string;
  unit: string;
  topic: string;
  transcript: string; // Now holds the actual text directly
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
    title: "Comparing Two-Digit Numbers",
    unit: "Unit 1: Place Value",
    topic: "Comparing Numbers",
    transcript: "Transcript for lesson 2 is being prepared.", 
  },
  {
    lessonId: "m3",
    title: "Hundreds Place Introduction", 
    unit: "Unit 1: Place Value",
    topic: "Three-Digit Numbers",
    transcript: "Transcript for lesson 3 is being prepared.",
  },
  {
    lessonId: "m4",
    title: "Expanded Form",
    unit: "Unit 1: Place Value", 
    topic: "Expanded Notation",
    transcript: "Transcript for lesson 4 is being prepared.",
  }
];

// Instant local functions (no more async/await)
export function getTranscriptByLessonId(lessonId: string): LessonTranscript | undefined {
  return LESSON_INFO.find(t => t.lessonId === lessonId);
}

export function getLessonInfoByUnit(unit: string): LessonTranscript[] {
  return LESSON_INFO.filter(t => t.unit === unit);
}