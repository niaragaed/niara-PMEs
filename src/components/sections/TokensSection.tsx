import { Building2, Car, Home, Tractor, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup, RevealItem } from "@/components/motion/RevealGroup";
import { SectionCard } from "./SectionCard";
import { ptBr } from "@/lib/i18n/pt-br";

const ICONS: Record<string, LucideIcon> = {
  "Token PMEs": Building2,
  "Token Auto": Car,
  "Token Agro": Tractor,
  "Token Imobiliário": Home,
};

// 3.3 — Conheça os Tokens. Fundo pêssego CHEIO, título em on-salmon; cada
// card linka para a rota-stub do token correspondente.
export function TokensSection() {
  return (
    <section id="tokens" className="bg-salmon px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-on-salmon sm:text-4xl">
            {ptBr.sections.tokens.title}
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ptBr.sections.tokens.items.map((item) => {
            const Icon = ICONS[item.title];
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
