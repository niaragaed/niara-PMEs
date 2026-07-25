"use client";

import { useState } from "react";
import { InvestorProfileQuiz } from "./InvestorProfileQuiz";
import { InvestorProfileResultCard } from "./InvestorProfileResultCard";
import { ptBr } from "@/lib/i18n/pt-br";

export function InvestorProfileSection() {
  const [retaking, setRetaking] = useState(false);
  const t = ptBr.perfil.investidor;

  return (
    <section id="perfil-investidor" aria-labelledby="perfil-investidor-heading" className="scroll-mt-24">
      <h2 id="perfil-investidor-heading" className="text-xl font-semibold text-on-military">
        {t.title}
      </h2>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>

      <div className="mt-6">
        {retaking ? (
          <InvestorProfileQuiz onDone={() => setRetaking(false)} />
        ) : (
          <InvestorProfileResultCard onRetake={() => setRetaking(true)} />
        )}
      </div>
    </section>
  );
}
