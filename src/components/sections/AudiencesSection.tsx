import { Reveal } from "@/components/motion/Reveal";
import { ptBr } from "@/lib/i18n/pt-br";

// Fundo pêssego CHEIO (não verde): a seção anterior (Tokens) e a faixa CTA
// final já são verde/pêssego/verde — se esta também fosse verde, ficaria
// verde→[aviso neutro]→verde colado na faixa CTA. Salmão aqui mantém a
// alternância de ritmo (ver CLAUDE.md).
export function AudiencesSection() {
  const { companies, investors } = ptBr.sections.audiences;

  return (
    <section id="audiences" className="bg-salmon px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-on-salmon sm:text-4xl">
            {ptBr.sections.audiences.title}
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Reveal className="rounded-lg border border-border bg-surface p-8 shadow-soft">
            <h3 className="text-xl font-semibold text-military">{companies.title}</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {companies.items.map((item) => (
                <li key={item} className="flex gap-3 text-ink-muted">
                  <span aria-hidden="true" className="text-military">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="rounded-lg border border-border bg-surface p-8 shadow-soft">
            <h3 className="text-xl font-semibold text-salmon-600">{investors.title}</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {investors.items.map((item) => (
                <li key={item} className="flex gap-3 text-ink-muted">
                  <span aria-hidden="true" className="text-salmon-600">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
