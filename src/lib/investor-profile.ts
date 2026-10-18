// Pure logic of the investor profile quiz (suitability) — no
// React, no storage. Equivalent to the API (Investor Profile Analysis)
// required by the CVM before recommending or allowing certain operations. The
// questions' content lives in dict.profile.investor.quiz (the i18n dictionary);
// this file only derives the score and the category from it. The answer weights are the same in
// both languages, so the scoring reads the Portuguese dictionary regardless of the locale.

import { pt } from "@/lib/i18n/pt-br";

export type InvestorCategory = "conservador" | "moderado" | "arrojado";

export type InvestorProfileResult = {
  category: InvestorCategory;
  score: number;
  completedAt: string; // ISO date
};

const QUESTIONS = pt.profile.investor.quiz.questions;

export const SCORE_MIN = QUESTIONS.reduce(
  (sum, q) => sum + Math.min(...q.options.map((o) => o.weight)),
  0,
);
export const SCORE_MAX = QUESTIONS.reduce(
  (sum, q) => sum + Math.max(...q.options.map((o) => o.weight)),
  0,
);

export function categorizeScore(score: number): InvestorCategory {
  const span = SCORE_MAX - SCORE_MIN;
  const conservativeLimit = SCORE_MIN + span / 3;
  const moderateLimit = SCORE_MIN + (span * 2) / 3;
  if (score <= conservativeLimit) return "conservador";
  if (score <= moderateLimit) return "moderado";
  return "arrojado";
}

// The default result shown in the demo before any re-evaluation —
// no real quiz was answered to arrive at it.
export const DEFAULT_INVESTOR_PROFILE: InvestorProfileResult = {
  category: "arrojado",
  score: SCORE_MAX,
  completedAt: "2026-07-19T00:00:00.000Z",
};
