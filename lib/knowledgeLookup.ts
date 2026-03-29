// lib/knowledgeLookup.ts

import { KNOWLEDGE_BASE, KnowledgeItem } from "./knowledgeBase";
import { findUnitByText, findTopicByText } from "./lessonTranscripts";

/* ----------------------------- Utils ----------------------------- */

function normalize(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

function includesPhrase(text: string, phrase: string): boolean {
  return normalize(text).includes(normalize(phrase));
}

/* ----------------------------- Scoring ----------------------------- */

function scoreItem(query: string, item: KnowledgeItem): number {
  const q = normalize(query);
  const tokens = tokenize(query);

  let score = 0;

  // Strong: direct question match
  for (const question of item.questions) {
    if (includesPhrase(q, question)) score += 50;
  }

  // Medium: keyword match
  for (const keyword of item.keywords) {
    if (includesPhrase(q, keyword)) score += 10;
  }

  // Token overlap
  for (const t of tokens) {
    if (item.keywords.some((k) => k.includes(t))) {
      score += 2;
    }
  }

  // Topic match boost
  const topic = findTopicByText(query);
  if (topic && topic === item.topic) {
    score += 15;
  }

  // Unit match boost
  const unit = findUnitByText(query);
  if (unit && unit === item.unit) {
    score += 10;
  }

  return score;
}

/* ----------------------------- Core Lookup ----------------------------- */

export function findBestKnowledge(query: string): KnowledgeItem | null {
  let best: KnowledgeItem | null = null;
  let bestScore = 0;

  for (const item of KNOWLEDGE_BASE) {
    const score = scoreItem(query, item);

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  // threshold to avoid nonsense matches
  if (bestScore < 8) return null;

  return best;
}

/* ----------------------------- Response Builder ----------------------------- */

export function buildKnowledgeResponse(item: KnowledgeItem): string {
  let response = `📘 ${item.answer}`;

  if (item.explanation) {
    response += `\n\n🧠 ${item.explanation}`;
  }

  if (item.example) {
    response += `\n\n✏️ Example:\n${item.example}`;
  }

  if (item.hint) {
    response += `\n\n💡 Hint: ${item.hint}`;
  }

  return response;
}

/* ----------------------------- Public API ----------------------------- */

export function getInstantAnswer(query: string): string {
  const match = findBestKnowledge(query);

  if (!match) {
    return (
      "🤔 I’m not sure about that yet.\n\n" +
      "Try asking about:\n" +
      "• Place value\n• Addition\n• Multiplication\n• Division"
    );
  }

  return buildKnowledgeResponse(match);
}

/* ----------------------------- Suggestions ----------------------------- */

export function getRelatedSuggestions(query: string): string[] {
  const match = findBestKnowledge(query);
  if (!match) return [];

  return match.questions.slice(0, 3);
}