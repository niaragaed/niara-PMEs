import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup, RevealItem } from "@/components/motion/RevealGroup";
import { SectionCard } from "./SectionCard";
import { ptBr } from "@/lib/i18n/pt-br";

// 3.1 — Benefícios da tokenização às PMEs. Fundo pêssego: título em ink,
// subtítulo em ink-peach (nunca ink-muted aqui, ver CLAUDE.md).
export function BenefitsSection() {
  return (
    <section id="benefits" className="bg-salmon-100 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {ptBr.sections.benefits.title}
          </h2>
          <p className="mt-3 text-lg text-ink-peach">{ptBr.sections.benefits.subtitle}</p>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-3">
          {ptBr.sections.benefits.items.map((item, index) => (
            <RevealItem key={item.title} className="h-full">
              <SectionCard chip={index + 1} title={item.title} description={item.description} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
