import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup, RevealItem } from "@/components/motion/RevealGroup";
import { SectionCard } from "./SectionCard";
import { ptBr } from "@/lib/i18n/pt-br";

// 3.2 — Quando posso usar a Tokenização? Fundo sálvia, título em ink.
export function WhenToUseSection() {
  return (
    <section id="when-to-use" className="bg-military-100 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {ptBr.sections.whenToUse.title}
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ptBr.sections.whenToUse.items.map((item, index) => (
            <RevealItem key={item.title}>
              <SectionCard chip={index + 1} title={item.title} description={item.description} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
