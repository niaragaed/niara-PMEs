import { Reveal } from "@/components/motion/Reveal";
import { ptBr } from "@/lib/i18n/pt-br";

export function WhatIsSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <Reveal className="flex flex-col items-center gap-4">
        <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {ptBr.sections.whatIs.title}
        </h2>
        <p className="text-lg text-ink-muted">{ptBr.sections.whatIs.subtitle}</p>
      </Reveal>
    </section>
  );
}
