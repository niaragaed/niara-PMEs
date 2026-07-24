import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ptBr } from "@/lib/i18n/pt-br";

export function FinalCtaSection() {
  return (
    <section className="px-6 py-20">
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {ptBr.sections.finalCta.title}
        </h2>
        <p className="text-lg text-ink-muted">{ptBr.sections.finalCta.subtitle}</p>
        <Link
          href="/sobre/contato"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-salmon px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-salmon-600"
        >
          {ptBr.sections.finalCta.cta}
        </Link>
      </Reveal>
    </section>
  );
}
