"use client";

import { useEffect, useId, useRef } from "react";
import { HelpCircle } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";

type IndicatorHelpProps = {
  nome: string;
  explicacao: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IndicatorHelp({ nome, explicacao, isOpen, onOpenChange }: IndicatorHelpProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={ptBr.negociar.oferta.indicadores.ajudaAria(nome)}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={() => onOpenChange(!isOpen)}
        className="rounded-full text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salmon"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          id={popoverId}
          role="tooltip"
          // Ancorado pela borda direita do botão (não centralizado): um popover
          // centralizado sobre um card perto da borda direita da grade poderia
          // ultrapassar a viewport no mobile e criar scroll horizontal na
          // página. Ancorando à direita, ele só se estende para a esquerda —
          // no pior caso é parcialmente cortado, nunca cria overflow.
          className="animate-dropdown absolute right-0 top-full z-20 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface p-3 text-xs leading-relaxed text-ink-muted shadow-soft-lg"
        >
          {explicacao}
        </div>
      )}
    </div>
  );
}
