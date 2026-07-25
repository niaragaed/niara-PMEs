import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup, RevealItem } from "@/components/motion/RevealGroup";
import { ptBr } from "@/lib/i18n/pt-br";

export function DifferentiatorsSection() {
  return (
    <section id="differentiators" className="bg-surface-alt px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {ptBr.sections.differentiators.title}
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {ptBr.sections.differentiators.items.map((item) => (
            <RevealItem
              key={item.title}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-6 shadow-soft"
            >
              <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
              <p className="text-sm text-ink-muted">{item.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
