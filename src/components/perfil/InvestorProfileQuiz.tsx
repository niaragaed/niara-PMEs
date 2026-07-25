"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePerfil } from "./PerfilContext";
import { categorizeScore } from "@/lib/investor-profile";
import { ptBr } from "@/lib/i18n/pt-br";

const QUESTIONS = ptBr.perfil.investidor.quiz.questions;

export function InvestorProfileQuiz({ onDone }: { onDone: () => void }) {
  const { setInvestorProfile } = usePerfil();
  const [step, setStep] = useState(0);
  // respostas ficam só neste estado em memória — nunca são persistidas
  // individualmente; só o resultado final vai para o contexto (também em
  // memória, sem localStorage).
  const [answers, setAnswers] = useState<Array<number | null>>(() => QUESTIONS.map(() => null));

  const t = ptBr.perfil.investidor.quiz;
  const question = QUESTIONS[step];
  const selected = answers[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  function selectOption(weight: number) {
    setAnswers((current) => current.map((value, index) => (index === step ? weight : value)));
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (selected === null) return;
    if (isLast) {
      const score = answers.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      setInvestorProfile({
        category: categorizeScore(score),
        score,
        completedAt: new Date().toISOString(),
      });
      onDone();
      return;
    }
    setStep((current) => current + 1);
  }

  return (
    <div className="rounded-lg border border-panel-border bg-panel p-6">
      <div className="flex items-center justify-between text-xs text-on-military-muted">
        <span>{t.questionCounter(step + 1, QUESTIONS.length)}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={QUESTIONS.length}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-military-600/40"
      >
        <div className="h-full rounded-full bg-salmon transition-all" style={{ width: `${progress}%` }} />
      </div>

      <fieldset className="mt-6">
        <legend className="text-base font-medium text-on-military">{question.prompt}</legend>
        <div className="mt-4 flex flex-col gap-2">
          {question.options.map((option) => {
            const optionId = `${question.id}-${option.weight}`;
            const checked = selected === option.weight;
            return (
              <label
                key={optionId}
                htmlFor={optionId}
                className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors ${
                  checked
                    ? "border-salmon bg-salmon/10 text-on-military"
                    : "border-panel-border text-on-military-muted hover:border-salmon/50"
                }`}
              >
                <input
                  id={optionId}
                  type="radio"
                  name={question.id}
                  checked={checked}
                  onChange={() => selectOption(option.weight)}
                  className="h-4 w-4 accent-salmon"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t.voltar}
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={selected === null}
          className="inline-flex items-center gap-1.5 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast ? t.verResultado : t.proximo}
          {!isLast && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
