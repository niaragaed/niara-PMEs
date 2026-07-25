import { DocumentacaoNav } from "./DocumentacaoNav";
import { FaqAccordion } from "./FaqAccordion";
import { ptBr } from "@/lib/i18n/pt-br";

export function DocumentacaoPage() {
  const t = ptBr.documentacao;

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{t.estagioAtual.label}</span>:{" "}
        {t.estagioAtual.texto}
      </div>

      <div className="border-b border-panel-border px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military sm:text-4xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-on-military-muted sm:text-base">
          {t.subtitle}
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-start">
        <DocumentacaoNav />

        <div className="min-w-0 flex-1 space-y-16">
          <section id="o-que-e" aria-labelledby="o-que-e-heading" className="scroll-mt-24">
            <h2 id="o-que-e-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.oQueE.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-military-muted sm:text-base">
              {t.oQueE.texto}
            </p>
          </section>

          <section id="como-funciona" aria-labelledby="como-funciona-heading" className="scroll-mt-24">
            <h2 id="como-funciona-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.comoFunciona.title}
            </h2>
            <ol className="mt-4 flex max-w-2xl flex-col gap-3">
              {t.comoFunciona.passos.map((passo, index) => (
                <li key={passo.titulo} className="flex gap-3 text-sm sm:text-base">
                  <span className="font-mono text-on-military-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-on-military-muted">
                    <span className="font-medium text-on-military">{passo.titulo}.</span>{" "}
                    {passo.texto}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section id="enquadramento" aria-labelledby="enquadramento-heading" className="scroll-mt-24">
            <h2 id="enquadramento-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.enquadramento.title}
            </h2>
            <div className="mt-4 flex max-w-2xl flex-col gap-3">
              {t.enquadramento.paragrafos.map((paragrafo) => (
                <p key={paragrafo} className="text-sm leading-relaxed text-on-military-muted sm:text-base">
                  {paragrafo}
                </p>
              ))}
            </div>
          </section>

          <section id="modelo-receita" aria-labelledby="modelo-receita-heading" className="scroll-mt-24">
            <h2 id="modelo-receita-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.modeloReceita.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-military-muted sm:text-base">
              {t.modeloReceita.texto}
            </p>
          </section>

          <section id="tecnologia" aria-labelledby="tecnologia-heading" className="scroll-mt-24">
            <h2 id="tecnologia-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.tecnologia.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-military-muted sm:text-base">
              {t.tecnologia.texto}
            </p>
          </section>

          <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24">
            <h2 id="faq-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.faq.title}
            </h2>
            <div className="mt-6 max-w-2xl">
              <FaqAccordion />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
