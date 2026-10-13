import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup, RevealItem } from "@/components/motion/RevealGroup";
import { SectionCard } from "./SectionCard";
import { getDictionary } from "@/lib/i18n/server";

// 3.1 — Benefits of tokenization for SMEs. SOLID peach background: title in
// on-salmon, subtitle in on-salmon-muted (ink-peach doesn't have enough contrast
// on the solid salmon, see CLAUDE.md).
export async function BenefitsSection() {
  const dict = await getDictionary();
  return (
    <section id="benefits" className="bg-salmon px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-on-salmon sm:text-4xl">
            {dict.sections.benefits.title}
          </h2>
          <p className="mt-3 text-lg text-on-salmon-muted">{dict.sections.benefits.subtitle}</p>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-3">
          {dict.sections.benefits.items.map((item, index) => (
            <RevealItem key={item.title} className="h-full">
              <SectionCard chip={index + 1} title={item.title} description={item.description} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
