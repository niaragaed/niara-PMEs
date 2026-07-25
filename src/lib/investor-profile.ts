// Lógica pura do questionário de perfil de investidor (suitability) — sem
// React, sem storage. Equivalente à API (Análise do Perfil do Investidor)
// exigida pela CVM antes de recomendar ou permitir certas operações. O
// conteúdo das perguntas vive em ptBr.perfil.investidor.quiz (dicionário de
// i18n), este arquivo só deriva a pontuação e a categoria a partir dele.

import { ptBr } from "@/lib/i18n/pt-br";

export type InvestorCategory = "conservador" | "moderado" | "arrojado";

export type InvestorProfileResult = {
  category: InvestorCategory;
  score: number;
  completedAt: string; // ISO date
};

const QUESTIONS = ptBr.perfil.investidor.quiz.questions;

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
  const conservadorLimit = SCORE_MIN + span / 3;
  const moderadoLimit = SCORE_MIN + (span * 2) / 3;
  if (score <= conservadorLimit) return "conservador";
  if (score <= moderadoLimit) return "moderado";
  return "arrojado";
}

// Resultado padrão exibido na demonstração antes de qualquer reavaliação —
// nenhum questionário real foi respondido para chegar nele.
export const DEFAULT_INVESTOR_PROFILE: InvestorProfileResult = {
  category: "arrojado",
  score: SCORE_MAX,
  completedAt: "2026-07-19T00:00:00.000Z",
};
