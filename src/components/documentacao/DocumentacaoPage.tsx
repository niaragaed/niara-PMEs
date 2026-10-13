import { DocsNav } from "./DocumentacaoNav";
import { FaqAccordion } from "./FaqAccordion";
import { getDictionary } from "@/lib/i18n/server";

export async function DocsPage() {
  const dict = await getDictionary();
  const t = dict.docs;

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{t.currentStage.label}</span>:{" "}
        {t.currentStage.text}
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
        <DocsNav />

        <div className="min-w-0 flex-1 space-y-16">
          <section id="what-is" aria-labelledby="what-is-heading" className="scroll-mt-24">
            <h2 id="what-is-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.whatIs.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-military-muted sm:text-base">
              {t.whatIs.text}
            </p>
          </section>

          <section id="how-tokenization-works" aria-labelledby="how-tokenization-works-heading" className="scroll-mt-24">
            <h2 id="how-tokenization-works-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.howItWorks.title}
            </h2>
            <ol className="mt-4 flex max-w-2xl flex-col gap-3">
              {t.howItWorks.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3 text-sm sm:text-base">
                  <span className="font-mono text-on-military-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-on-military-muted">
                    <span className="font-medium text-on-military">{step.title}.</span>{" "}
                    {step.text}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section id="framework" aria-labelledby="framework-heading" className="scroll-mt-24">
            <h2 id="framework-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.framework.title}
            </h2>
            <div className="mt-4 flex max-w-2xl flex-col gap-3">
              {t.framework.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-on-military-muted sm:text-base">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section id="revenue-model" aria-labelledby="revenue-model-heading" className="scroll-mt-24">
            <h2 id="revenue-model-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.revenueModel.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-military-muted sm:text-base">
              {t.revenueModel.text}
            </p>
          </section>

          <section id="technology" aria-labelledby="technology-heading" className="scroll-mt-24">
            <h2 id="technology-heading" className="text-xl font-semibold text-on-military sm:text-2xl">
              {t.technology.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-military-muted sm:text-base">
              {t.technology.text}
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
