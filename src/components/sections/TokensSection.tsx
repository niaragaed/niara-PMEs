import { Building2, Car, Home, Tractor, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup, RevealItem } from "@/components/motion/RevealGroup";
import { SectionCard } from "./SectionCard";
import { getDictionary } from "@/lib/i18n/server";

// Keyed by the card's route (stable across languages), never by its translated title.
const ICONS: Record<string, LucideIcon> = {
  "/negociar/token-pmes": Building2,
  "/negociar/token-auto": Car,
  "/negociar/token-agro": Tractor,
  "/negociar/token-imobiliario": Home,
};

// 3.3 — Meet the Tokens. SOLID peach background, title in on-salmon; each
// card links to the matching token's route.
export async function TokensSection() {
  const dict = await getDictionary();
  return (
    <section id="tokens" className="bg-salmon px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-on-salmon sm:text-4xl">
            {dict.sections.tokens.title}
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dict.sections.tokens.items.map((item) => {
            const Icon = ICONS[item.href];
            return (
              <RevealItem key={item.title}>
                <SectionCard
                  chip={<Icon className="h-5 w-5" aria-hidden="true" />}
                  title={item.title}
                  description={item.description}
                  href={item.href}
                />
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
