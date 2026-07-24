import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup, RevealItem } from "@/components/motion/RevealGroup";
import { ptBr } from "@/lib/i18n/pt-br";

export function HowItWorksSection() {
  return (
    <section className="bg-surface-alt px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {ptBr.sections.howItWorks.title}
          </h2>
          <p className="mt-3 text-lg text-ink-muted">{ptBr.sections.howItWorks.subtitle}</p>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ptBr.sections.howItWorks.steps.map((step, index) => (
            <RevealItem
              key={step.title}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6 shadow-soft"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-military-100 text-sm font-semibold text-military">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
              <p className="text-sm text-ink-muted">{step.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
