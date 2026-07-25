"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-panel-border rounded-lg border border-panel-border bg-panel">
      {ptBr.documentacao.faq.items.map((item, index) => {
        const isOpen = openIndex === index;
        const buttonId = `faq-button-${index}`;
        const panelId = `faq-panel-${index}`;
        return (
          <div key={item.pergunta}>
            <h3 className="text-base font-normal">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-medium text-on-military"
              >
                {item.pergunta}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-on-military-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </h3>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="px-4 pb-4 text-sm leading-relaxed text-on-military-muted"
              >
                {item.resposta}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
