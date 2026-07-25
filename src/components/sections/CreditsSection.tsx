import { Reveal } from "@/components/motion/Reveal";
import { ptBr } from "@/lib/i18n/pt-br";

// Tela final antes do footer — sóbria, sem inventar nomes/parcerias reais.
export function CreditsSection() {
  return (
    <section id="credits" className="px-6 py-24 text-center">
      <Reveal className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {ptBr.sections.credits.title}
        </h2>
        <p className="text-lg text-ink-muted">{ptBr.sections.credits.subtitle}</p>

        <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-ink-muted">
          {ptBr.sections.credits.roles.map((role, index) => (
            <li key={role} className="flex items-center gap-3">
              {role}
              {index < ptBr.sections.credits.roles.length - 1 && (
                <span aria-hidden="true" className="text-border">
                  ·
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-2 max-w-sm text-xs text-ink-muted">{ptBr.sections.credits.note}</p>
      </Reveal>
    </section>
  );
}
