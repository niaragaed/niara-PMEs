"use client";

import { useEffect, useRef, useState } from "react";
import { InvestorProfileQuiz } from "./InvestorProfileQuiz";
import { InvestorProfileResultCard } from "./InvestorProfileResultCard";
import { ptBr } from "@/lib/i18n/pt-br";

type InvestorProfileSectionProps = {
  // true só na primeira visita a /perfil logo após criar a conta
  // (?onboarding=1 vindo de /cadastro) — abre o questionário direto em vez
  // do resultado padrão "Arrojado" e rola a seção até a viewport, já que
  // ela não é a primeira da página.
  abrirAutomaticamente?: boolean;
};

export function InvestorProfileSection({ abrirAutomaticamente }: InvestorProfileSectionProps) {
  const [retaking, setRetaking] = useState(Boolean(abrirAutomaticamente));
  const sectionRef = useRef<HTMLElement>(null);
  const t = ptBr.perfil.investidor;

  useEffect(() => {
    if (abrirAutomaticamente) {
      sectionRef.current?.scrollIntoView({ block: "start" });
      // Remove o ?onboarding=1 da URL depois de já ter aberto o
      // questionário — sem isso, um F5 nesta mesma página reabriria o
      // questionário do zero (o estado de "retaking" é recalculado a
      // partir da prop a cada montagem).
      const url = new URL(window.location.href);
      url.searchParams.delete("onboarding");
      window.history.replaceState(null, "", url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem
  }, []);

  return (
    <section
      ref={sectionRef}
      id="perfil-investidor"
      aria-labelledby="perfil-investidor-heading"
      className="scroll-mt-24"
    >
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
