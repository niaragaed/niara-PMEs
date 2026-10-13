import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup, RevealItem } from "@/components/motion/RevealGroup";
import { SectionCard } from "./SectionCard";
import { getDictionary } from "@/lib/i18n/server";

// 3.2 — When can I use tokenization? SOLID sage background, title in
// on-military (light, the same pattern as the final CTA band).
export async function WhenToUseSection() {
  const dict = await getDictionary();
  return (
    <section id="when-to-use" className="bg-military px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-on-military sm:text-4xl">
            {dict.sections.whenToUse.title}
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dict.sections.whenToUse.items.map((item, index) => (
            <RevealItem key={item.title} className="h-full">
              <SectionCard chip={index + 1} title={item.title} description={item.description} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
