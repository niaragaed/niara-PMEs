import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { getDictionary } from "@/lib/i18n/server";

// Faixa CTA final, fundo verde-sálvia sólido — precisa sobrescrever a cor
// de heading padrão (ink, definida globalmente) para ficar legível.
export async function FinalCtaSection() {
  const dict = await getDictionary();
  return (
    <section id="final-cta" className="bg-military px-6 py-20">
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-bg sm:text-4xl">
          {dict.sections.finalCta.title}
        </h2>
        <p className="text-lg text-bg/80">{dict.sections.finalCta.subtitle}</p>
        <Link
          href="/sobre/contato"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-salmon px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-salmon-600"
        >
          {dict.sections.finalCta.cta}
        </Link>
      </Reveal>
    </section>
  );
}
